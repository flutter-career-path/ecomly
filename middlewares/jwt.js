const { expressjwt: expJwt } = require('express-jwt');

function authJwt() {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const API = process.env.API_URL;
  return expJwt({
    secret,
    algorithms: ['HS256'],
    isRevoked: isRevoked,
  }).unless({
    path: [
      `${API}/login`,
      `${API}/login/`,

      `${API}/register`,
      `${API}/register/`,
      // /\/public\/uploads(.*)/
      { url: /\/public\/.*/, methods: ['GET', 'OPTIONS'] },
    ],
  });
}

async function isRevoked(req, jwt) {
  // Check if the user is not an admin and is trying to access an admin route
  return !jwt.payload.isAdmin && req.baseUrl.includes('admin');
}

module.exports = authJwt;
