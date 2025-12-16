const moment = require('moment');

function generateDateLabels() {
    const labels = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
        const date = moment().add(i, 'days');
        const dayName = dayNames[date.day() === 0 ? 6 : date.day() - 1]; // Adjust for Monday start
        
        if (i === 0) {
            labels.push('Today');
        } else if (i === 1) {
            labels.push('Tmrw');
        } else {
            labels.push(dayName);
        }
    }
    
    return labels;
}

module.exports = {
    generateDateLabels
};
