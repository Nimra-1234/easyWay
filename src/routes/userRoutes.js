import express from 'express';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { createUser, getUser, updateUser, deleteUser,getLuckyDrawEligibleUsers,checkUserEligibility } from '../controllers/userController.js'; // Import the user controller functions

const router = express.Router();

/**
 * @swagger
 * /api/users/admin/lucky-draw:
 *   get:
 *     summary: Admin endpoint to get detailed lucky draw data
 *     tags: [Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: header
 *         name: admin-code
 *         schema:
 *           type: string
 *         required: true
 *         description: Secure admin authentication code
 *     responses:
 *       200:
 *         description: Detailed lucky draw data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalUsers:
 *                   type: integer
 *                   example: 50
 *                 eligibleUsers:
 *                   type: integer
 *                   example: 10
 *                 threshold:
 *                   type: integer
 *                   description: Number of tickets needed for eligibility
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LuckyDrawUser'
 *                 metadata:
 *                   $ref: '#/components/schemas/DrawMetadata'
 *       401:
 *         $ref: '#/components/responses/AdminUnauthorized'
 *       403:
 *         description: Invalid admin credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid admin credentials"
 *       500:
 *         description: Server error
 */
router.get('/admin/lucky-draw', isAdmin, getLuckyDrawEligibleUsers);  // Admin endpoint

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
