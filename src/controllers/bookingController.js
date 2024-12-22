import { set, get } from '../config/redisClient';

export async function createBooking(req, res) {
    const { id, userId, source, destination, time } = req.body;
    try {
        const booking = { id, userId, source, destination, time, status: 'confirmed' };
        await set(`booking:${id}`, JSON.stringify(booking));
        res.status(201).send(booking);
    } catch (error) {
        res.status(500).send(error.message);
    }
}

export async function getBooking(req, res) {
    try {
        const booking = await get(`booking:${req.params.id}`);
        if (booking) {
            res.status(200).json(JSON.parse(booking));
        } else {
            res.status(404).send('Booking not found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
}

export async function cancelBooking(req, res) {
    try {
        const booking = await get(`booking:${req.params.id}`);
        if (booking) {
            const updatedBooking = { ...JSON.parse(booking), status: 'cancelled' };
            await set(`booking:${req.params.id}`, JSON.stringify(updatedBooking));
            res.status(200).send(updatedBooking);
        } else {
            res.status(404).send('Booking not found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
}
