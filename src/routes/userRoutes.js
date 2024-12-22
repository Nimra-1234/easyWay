import express from 'express';
import { createUser, getUser, getTicketCount, loginUser, updateUser, deleteUser } from '../controllers/userController.js'; // Import the user controller functions

const router = express.Router();

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user and store user details in the system.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               taxCode:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/create', createUser);

/**
 * @swagger
 * /api/users/{taxCode}:
 *   get:
 *     summary: Get user details
 *     description: Fetch user details by taxCode.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         description: The user's taxCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details returned successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:taxCode', getUser);

/**
 * @swagger
 * /api/users/{taxCode}/ticketCount:
 *   get:
 *     summary: Get user's ticket count
 *     description: Fetch the number of tickets a user has purchased by their taxCode.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         description: The user's taxCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket count returned successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:taxCode/ticketCount', getTicketCount);

/**
 * @swagger
 * /api/users/{taxCode}:
 *   put:
 *     summary: Update user details
 *     description: Update user details by taxCode.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         description: The user's taxCode to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       400:
 *         description: Bad Request
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
router.put('/:taxCode', updateUser);

/**
 * @swagger
 * /api/users/{taxCode}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user by taxCode.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         description: The user's taxCode to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
router.delete('/:taxCode', deleteUser);

export default router;
