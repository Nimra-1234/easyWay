import mongoose from 'mongoose';

const stopInTripSchema = new mongoose.Schema({
    stop_id: { type: String, required: true },
    stop_name: { type: String, required: true },
    arrival_time: { type: String, required: true },
    departure_time: { type: String, required: true },
    sequence: { type: Number, required: true }
}, { _id: false });

const tripSchema = new mongoose.Schema({
    trip_id: { type: String, required: true },
    route_id: { type: String, required: true },
    service_id: { type: String, required: true },
    trip_headsign: String,
    direction_id: Number,
    // Flattened and simplified stop sequence
    itinerary: [stopInTripSchema]
}, { 
    collection: 'trips',
    // Add virtual for journey duration
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating trip duration
tripSchema.virtual('duration').get(function() {
    if (this.itinerary && this.itinerary.length > 1) {
        const start = this.itinerary[0].departure_time;
        const end = this.itinerary[this.itinerary.length - 1].arrival_time;
        // Convert times to minutes for comparison
        const [startHours, startMins] = start.split(':').map(Number);
        const [endHours, endMins] = end.split(':').map(Number);
        return (endHours * 60 + endMins) - (startHours * 60 + startMins);
    }
    return 0;
});

// Add useful methods
tripSchema.methods.getStopBySequence = function(sequence) {
    return this.itinerary.find(stop => stop.sequence === sequence);
};

tripSchema.methods.getNextStop = function(currentStopId) {
    const currentIndex = this.itinerary.findIndex(stop => stop.stop_id === currentStopId);
    return currentIndex < this.itinerary.length - 1 ? this.itinerary[currentIndex + 1] : null;
};

const Trip = mongoose.model('Trip', tripSchema);

tripSchema.index({ trip_id: 1 }, { unique: true });

export default Trip;