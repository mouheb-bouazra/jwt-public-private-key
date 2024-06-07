var express = require('express');
var router = express.Router();
const { generateKeyPair, exportJWK, SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');

const keys = {}

/* GET generate keys. */
router.get('/generate-keys', async function (req, res, next) {
  try {
    const keys = await generateKeys()
    return res.json(keys);
  } catch (error) {
    return res.json({ error: error?.message })
  }
});

/* GET generate jwks. */
router.get('/generate-jwks', async function (req, res, next) {
  try {
    const publicJwk = await exportJWK(keys.publicKey);
    return res.json({ publicJwk });
  } catch (error) {
    return res.json({ error: error?.message })
  }
});

/* GET generate token. */
router.get('/generate-token', async function (req, res, next) {
  try {
    const token = await new SignJWT({
      myClaim: true,
    })
      .setProtectedHeader({
        typ: 'JWT',
        alg: 'RS256',
      })
      .setIssuer('https://example.com')
      .setSubject('uniqueUserId')
      .setAudience('myapp.com')
      .setExpirationTime('6h')
      .setIssuedAt()
      .sign(keys.privateKey);

    keys.token = token
    return res.json({ token });
  } catch (error) {
    return res.json({ error: error?.message })
  }
});

/* GET verify token. */
router.get('/verify-token', async function (req, res, next) {
  try {
    const { payload, protectedHeader } = await jwtVerify(keys.token || '', keys.publicKey);
    return res.json({ payload, protectedHeader });
  } catch (error) {
    return res.json({ error: error?.message })
  }
});

/* GET generate rsa public key. */
router.get('/generate-rsa-public-key', async function (req, res, next) {
  try {
    const publicJwk = await convertKeyStringToRsaKey(keys.publicKeyString)
    return res.json({ publicJwk });
  } catch (error) {
    return res.json({ error: error?.message })
  }
});

const generateKeys = async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');

  keys.publicKeyString = publicKey.export({
    type: 'pkcs1',
    format: 'pem',
  });

  keys.privateKeyString = privateKey.export({
    type: 'pkcs1',
    format: 'pem',
  });

  keys.publicKey = publicKey
  keys.privateKey = privateKey

  return keys
}

const convertKeyStringToRsaKey = async (keyString) => {
  // Ensure the key string is properly formatted
  const formattedKeyString = keyString.replace(/\\n/g, '\n');
  const cryptoPublicKey = crypto.createPublicKey(formattedKeyString);
  return await exportJWK(cryptoPublicKey); // publicJwk
};

module.exports = router;
