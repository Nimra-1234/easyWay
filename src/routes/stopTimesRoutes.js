import express from 'express';
import { getAllStopTimes } from '../controllers/stopTimesController.js';

const router = express.Router();

router.get('/', getAllStopTimes);

export default router; // Use a default export