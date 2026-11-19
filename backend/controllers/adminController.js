// controllers/adminController.js
const revokedSvc = require('../services/revokedTokenService.js');

exports.listRevokedTokens = async (req, res) => {
    try {
        const { page, pageSize, orderBy, orderDir } = req.query;
        const result = await revokedSvc.listPaged({ page, pageSize, orderBy, orderDir });
        res.json(result);
    } catch (err) {
        console.error('[ADMIN] listRevokedTokens error:', err);
        res.status(500).json({ message: 'Error al listar tokens revocados' });
    }
};
