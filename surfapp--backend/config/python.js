const path = require('path');

const getPythonExecutable = () => {
    if (process.env.PYTHON_PATH) {
        return process.env.PYTHON_PATH;
    }
    
    const isWin = process.platform === "win32";
    const venvPath = path.resolve(__dirname, '..', '..', 'surfapp--ml-engine', 'venv');
    
    if (isWin) {
        return path.join(venvPath, 'Scripts', 'python.exe');
    } else {
        return path.join(venvPath, 'bin', 'python');
    }
};

const PYTHON_EXECUTABLE = getPythonExecutable();
const SPOT_RECOMMENDER_SCRIPT = path.resolve(__dirname, '..', '..', 'surfapp--ml-engine', 'spot_recommender_service.py');
const FORECAST_7DAY_SCRIPT = path.resolve(__dirname, '..', '..', 'surfapp--ml-engine', 'forecast_7day_service.py');

module.exports = {
    PYTHON_EXECUTABLE,
    SPOT_RECOMMENDER_SCRIPT,
    FORECAST_7DAY_SCRIPT
};
