import express from 'express';
import { createUser, getUser, updateUser, deleteUser,getLuckyDrawEligibleUsers,checkUserEligibility } from '../controllers/userController.js'; // Import the user controller functions

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     EligibilityStatus:
 *       type: object
 *       properties:
 *         isEligible:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Congratulations! You are eligible for the lucky draw with 250 tickets"
 *         extraEntries:
 *           type: integer
 *           example: 1
 *     
 *     EligibleUser:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         contact:
 *           type: string
 *           example: "string@gmail.com"
 *         totalTickets:
 *           type: integer
 *           example: 250
 *         eligibilityStatus:
 *           $ref: '#/components/schemas/EligibilityStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-16T20:21:48.521Z"
 *
 * /api/users/lucky-draw:
 *   get:
 *     summary: Get all users eligible for lucky draw
 *     tags: [Users]
 *     description: Retrieves all users who have bought more than 200 tickets and are eligible for lucky draw
 *     responses:
 *       200:
 *         description: List of eligible users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalEligibleUsers:
 *                   type: integer
 *                   example: 2
 *                 summary:
 *                   type: object
 *                   properties:
 *                     threshold:
 *                       type: integer
 *                       example: 200
 *                     drawDate:
 *                       type: string
 *                       example: "2025-02-01"
 *                     prizePools:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["1st Prize: $1000", "2nd Prize: $500", "3rd Prize: $250"]
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EligibleUser'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *
 */
router.get('/lucky-draw', getLuckyDrawEligibleUsers);

/**
 * @swagger
 * /api/users/lucky-draw/{taxCode}/check-eligibility:
 *   get:
 *     summary: Check lucky draw eligibility for a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9]{14}$
 *         description: Tax code of the user to check
 *         example: stringnimra134
 *     responses:
 *       200:
 *         description: User eligibility status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     taxCode:
 *                       type: string
 *                       example: "stringnimra134"
 *                     contact:
 *                       type: string
 *                       example: "string@gmail.com"
 *                     totalTickets:
 *                       type: integer
 *                       example: 10
 *                     eligibilityStatus:
 *                       type: object
 *                       properties:
 *                         isEligible:
 *                           type: boolean
 *                           example: true
 *                         currentTickets:
 *                           type: integer
 *                           example: 10
 *                         ticketsNeeded:
 *                           type: integer
 *                           example: 0
 *                         message:
 *                           type: string
 *                           example: "Congratulations! You're eligible for the lucky draw!"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User with tax code stringnimra134 not found"
 *       500:
 *         description: Server error
 */
router.get('/lucky-draw/:taxCode/check-eligibility', checkUserEligibility);

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
 * /api/users/{taxCode}:
 *   patch:
 *     summary: Update user details
 *     description: Update user details by taxCode. Name and contact are optional - you can update either or both.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: taxCode
 *         required: true
 *         description: The user's taxCode to update (14 characters alphanumeric)
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9]{14}$
 *           example: ABCDEFGHIJKLMN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's new name (optional)
 *                 example: John Doe
 *               contact:
 *                 type: string
 *                 description: User's new email address (optional)
 *                 format: email
 *                 example: john.doe@example.com
 *             minProperties: 1
 *           examples:
 *             nameOnly:
 *               summary: Update only name
 *               value:
 *                 name: John Doe
 *             contactOnly:
 *               summary: Update only email
 *               value:
 *                 contact: john.doe@example.com
 *             bothFields:
 *               summary: Update both fields
 *               value:
 *                 name: John Doe
 *                 contact: john.doe@example.com
 *     responses:
 *       200:
 *         description: User details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User details updated successfully
 *                 updatedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [name, contact]
 *                   example: ["name", "contact"]
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid contact format. Must be a valid email address.
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.patch('/:taxCode', updateUser);

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
