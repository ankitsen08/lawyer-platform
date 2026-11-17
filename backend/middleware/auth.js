const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'production_secure_lawyer_comparison_secret_jwt_key_2026';

function verifyTokenSafe(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Decodes both client and lawyer session cookies if present, plus Authorization Bearer header.
 * Allows dual sessions (client + lawyer) in a single browser during review without cookie shadowing.
 */
function parseSessions(req) {
  let bearerUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerUser = verifyTokenSafe(authHeader.split(' ')[1]);
  }

  const clientUser = req.cookies?.client_session ? verifyTokenSafe(req.cookies.client_session) : null;
  const lawyerUser = req.cookies?.lawyer_session ? verifyTokenSafe(req.cookies.lawyer_session) : null;

  return { bearerUser, clientUser, lawyerUser };
}

function authenticate(req, res, next) {
  const { bearerUser, clientUser, lawyerUser } = parseSessions(req);
  const primaryUser = bearerUser || clientUser || lawyerUser;

  if (!primaryUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = primaryUser;
  req.clientUser = bearerUser?.role === 'client' ? bearerUser : clientUser;
  req.lawyerUser = bearerUser?.role === 'lawyer' ? bearerUser : lawyerUser;
  next();
}

function optionalAuth(req, res, next) {
  const { bearerUser, clientUser, lawyerUser } = parseSessions(req);
  req.user = bearerUser || clientUser || lawyerUser || null;
  req.clientUser = bearerUser?.role === 'client' ? bearerUser : clientUser;
  req.lawyerUser = bearerUser?.role === 'lawyer' ? bearerUser : lawyerUser;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const matched = role === 'lawyer'
      ? (req.lawyerUser || (req.user?.role === 'lawyer' ? req.user : null))
      : (req.clientUser || (req.user?.role === 'client' ? req.user : null));

    if (!matched || matched.role !== role) {
      return res.status(403).json({ error: `Forbidden: requires ${role} privileges` });
    }
    req.user = matched;
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
};
