import express from 'express';
import { toggleFavorite, getMyFavorites } from '../controllers/favoriteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/toggle', toggleFavorite);
router.get('/', getMyFavorites);

export default router;
