const Party = require("../models/Party");

async function authMiddleware(req, res, next) {
    try {
        // Skip auth for guest order creation endpoint
        if (req.path === '/guest/create' && req.method === 'POST') {
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: "Missing Authorization header"
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Invalid Authorization format"
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                error: "Token missing"
            });
        }

        const party = await Party.findOne({ partyId: token });
        if (!party) {
            return res.status(401).json({
                error: "Invalid token"
            });
        }

        req.party = {
            partyId: party.partyId,
            name: party.name,
            role: party.role
        };

        next();
    } catch (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({
            error: "Internal server error during authentication"
        });
    }
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.party) {
            return res.status(401).json({
                error: "Unauthenticated request"
            });
        }

        if (!allowedRoles.includes(req.party.role)) {
            return res.status(403).json({
                error: "Forbidden: insufficient permissions"
            });
        }

        next();
    };
}

module.exports = {
    authMiddleware,
    authorizeRoles
};