# 🌊 Surf Ceylon Learning Roadmap
## From Basics to ML-Powered Surf Forecasting

**Your Background:** Express.js basics + React basics  
**Goal:** Understand the complete ML-powered surf forecasting system  
**Approach:** Bottom-up (ML fundamentals → Implementation specifics)

---

## 📚 Phase 1: Machine Learning Fundamentals (2-3 weeks)

### 1.1 Python Basics (If needed - 3-5 days)
**Why:** All ML code is in Python

**Resources:**
- [Python Crash Course (First 5 chapters)](https://nostarch.com/pythoncrashcourse2e) - Book
- [Python for Everybody (Coursera)](https://www.coursera.org/specializations/python) - Free course
- [Real Python - Python Basics](https://realpython.com/learning-paths/python3-introduction/) - Interactive

**Focus On:**
- Variables, data types, functions
- Lists, dictionaries, numpy arrays
- File I/O (JSON, CSV)
- Object-oriented programming basics

**Practice:**
```python
# Read your project files to understand:
# surfapp--ml-engine/utils/mock_data.py
# surfapp--ml-engine/config/features.py
```

---

### 1.2 NumPy & Pandas (1 week)
**Why:** Data manipulation is 80% of ML work

**Resources:**
- [NumPy Quickstart](https://numpy.org/doc/stable/user/quickstart.html) - Official docs
- [Pandas Getting Started](https://pandas.pydata.org/docs/getting_started/intro_tutorials/) - Official tutorials
- [Kaggle Learn - Pandas](https://www.kaggle.com/learn/pandas) - Free interactive

**Key Concepts:**
- Arrays, matrices, indexing
- Broadcasting, vectorization
- DataFrames, Series
- Data cleaning, filtering, aggregation

**Practice with Your Code:**
```python
# Analyze these files:
# training/prepare_timeseries_data.py (lines 17-110)
# - See how JSON → DataFrame → NumPy arrays
# - Understand time-series windowing
```

---

### 1.3 Machine Learning Concepts (1-2 weeks)
**Why:** Understand what your models are actually doing

**Resources:**
- [Machine Learning Crash Course (Google)](https://developers.google.com/machine-learning/crash-course) - FREE, excellent
- [StatQuest YouTube Channel](https://www.youtube.com/c/joshstarmer) - Visual explanations
- [3Blue1Brown - Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) - Beautiful visualizations

**Core Topics:**
1. **Supervised Learning**
   - Features vs. Targets
   - Training vs. Testing
   - Overfitting vs. Underfitting

2. **Regression vs. Classification**
   - Your app uses regression (predicting continuous values like wave height)

3. **Evaluation Metrics**
   - R² Score (your model: 0.92 for waves)
   - MAE, MSE, RMSE
   - Why these matter for forecasting

**In Your Code:**
```python
# See metrics in:
# training/train_model.py (lines 200-250)
# - R² score calculation
# - Feature importance analysis
```

---

## 🎯 Phase 2: Your ML Models Deep Dive (3-4 weeks)

### 2.1 Random Forest (Week 1)
**What It Does:** Predicts current conditions for 50+ surf spots

**Learn:**
1. **Decision Trees Basics**
   - [StatQuest - Decision Trees](https://www.youtube.com/watch?v=7VeUPuFGJHk) - 17 min
   - How splits work, entropy, information gain

2. **Ensemble Methods**
   - [StatQuest - Random Forests](https://www.youtube.com/watch?v=J4Wdy0Wc_xQ) - 10 min
   - Why 100 trees > 1 tree

3. **Scikit-learn Tutorial**
   - [Official Random Forest Guide](https://scikit-learn.org/stable/modules/ensemble.html#forest)
   - [Hands-On ML with Scikit-Learn](https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/) - Chapter 7

**Your Implementation:**
```python
# Study these files in order:
# 1. training/train_model.py (main training script)
#    - Feature engineering (lines 150-180)
#    - Model training (lines 220-260)
#    - Multi-output prediction (4 targets)

# 2. services/spot_predictor.py (production usage)
#    - How model loads (lines 30-50)
#    - Feature engineering match (lines 80-100)
#    - Batch prediction for 50+ spots
```

**Key Questions to Answer:**
- Why 15 features but only 10 raw inputs? (Feature engineering!)
- What are: swellEnergy, offshoreWind, windSwellInteraction?
- Why multi-output (4 predictions in one model)?

---

### 2.2 LSTM Neural Networks (Week 2-3)
**What It Does:** 7-day forecast (168 hours) for any location

**Foundation - Neural Networks:**
1. **Basics**
   - [3Blue1Brown - But what is a neural network?](https://www.youtube.com/watch?v=aircAruvnKk) - 19 min
   - Neurons, layers, activation functions
   - Forward pass, backpropagation

2. **Deep Learning Course**
   - [Fast.ai Practical Deep Learning](https://course.fast.ai/) - FREE, top-down approach
   - [Deep Learning Specialization (Coursera)](https://www.coursera.org/specializations/deep-learning) - Andrew Ng

**LSTM Specifics:**
1. **Recurrent Neural Networks (RNN)**
   - [StatQuest - RNNs](https://www.youtube.com/watch?v=AsNTP8Kwu80) - 11 min
   - Why sequence matters (time-series data)

2. **LSTM Architecture**
   - [Illustrated Guide to LSTM](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) - Blog post, excellent diagrams
   - [StatQuest - LSTM](https://www.youtube.com/watch?v=YCzL96nL7j0) - 10 min
   - Cell state, forget gate, input gate, output gate

3. **TensorFlow/Keras**
   - [TensorFlow Tutorials](https://www.tensorflow.org/tutorials) - Official
   - [Keras Sequential API](https://keras.io/guides/sequential_model/) - Your model uses this

**Your Implementation:**
```python
# Study in this order:

# 1. Data Preparation
# training/prepare_timeseries_data.py
# - Sliding window approach (lines 70-105)
# - Input: past 168 hours → Output: next 168 hours
# - Shape transformations: (samples, 168, 6)

# 2. Model Architecture
# training/train_wave_forecast_lstm.py
# - Model definition (lines 140-165)
#   LSTM(64) → Dropout(0.2) → LSTM(32) → Dense(1008)
# - Why 1008 outputs? (168 hours × 6 features)

# 3. Training Process
# - Data scaling (lines 95-120)
# - Loss function: Huber (robust to outliers)
# - Callbacks: EarlyStopping, ReduceLROnPlateau

# 4. Production Usage
# services/forecast_predictor.py
# - How to prepare input (lines 60-90)
# - Inverse scaling (lines 120-150)
# - Reshaping predictions
```

**Critical Concepts:**
- **Stateful vs. Stateless LSTM** (yours is stateless)
- **Sequence-to-Sequence** (many-to-many)
- **Multi-output time-series** (6 features simultaneously)
- **Scaling** (why MinMaxScaler? → LSTM sensitive to scale)

**Experiments to Try:**
```python
# Modify train_wave_forecast_lstm.py to understand:
1. Change EPOCHS (line 220) - see overfitting
2. Change LSTM units (64 → 32) - see performance drop
3. Remove Dropout - see validation diverge
4. Change lookback (168 → 24) - see how past affects future
```

---

### 2.3 Feature Engineering (Week 4)
**Why Critical:** Good features > complex models

**Learn:**
- [Applied Machine Learning Process (Google)](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [Feature Engineering for Machine Learning (Book)](https://www.oreilly.com/library/view/feature-engineering-for/9781491953235/)

**Your Feature Engineering:**
```python
# training/train_model.py (lines 150-185)
# Domain-specific features:

1. swellEnergy = swellHeight² × swellPeriod
   → Physics-based: wave energy formula
   
2. offshoreWind = windSpeed × cos(windDirection - 270)
   → Offshore wind = good for surfing
   
3. totalSwellHeight = primary + secondary swell
   → Combined wave power
   
4. windSwellInteraction = windSpeed × swellHeight
   → Wind's effect on wave shape
   
5. periodRatio = primary / secondary period
   → Swell quality indicator
```

**Why These Work:**
- Domain knowledge (surf physics) encoded
- Non-linear relationships captured
- Correlated features combined

**Exercise:**
Create a feature importance visualization:
```python
# Add to train_model.py after training:
import matplotlib.pyplot as plt

importances = model.feature_importances_
features = ['feature1', 'feature2', ...]
plt.barh(features, importances)
plt.xlabel('Importance')
plt.title('Feature Importance')
plt.show()
```

---

## 🔄 Phase 3: System Integration (2 weeks)

### 3.1 Python ↔ Node.js Communication
**How Your System Works:** Node.js spawns Python processes

**Learn:**
- [Child Processes in Node.js](https://nodejs.org/api/child_process.html)
- [subprocess in Python](https://docs.python.org/3/library/subprocess.html)

**Your Implementation:**
```javascript
// backend/controllers/spotsController.js (lines 170-260)

1. spawn() creates Python process
2. Python prints JSON to stdout
3. Node captures stdout
4. Parse JSON, return to client

Key files:
- spotsController.js: Node side
- spot_recommender_service.py: Python side (if __name__ == '__main__')
- forecast_7day_service.py: Python side
```

**Try:**
```bash
# Run Python service directly:
cd surfapp--ml-engine
python spot_recommender_service.py

# See JSON output → this is what Node.js receives
```

---

### 3.2 Caching Strategy
**Why:** Don't re-run ML models every request (expensive!)

**Learn:**
- [Caching Strategies](https://aws.amazon.com/caching/best-practices/)
- In-memory caching basics

**Your Implementation:**
```javascript
// backend/config/cache.js

1. spotPredictionCache
   - TTL: 5 minutes
   - Stores predictions for all 50+ spots
   - Key: 'spot_predictions'

2. When to invalidate?
   - After TTL expires
   - Manual refresh button (future feature)
```

---

### 3.3 Scoring Algorithm
**The Heart of Your App:** EnhancedSuitabilityCalculator

**Your Implementation:**
```javascript
// backend/controllers/EnhancedSuitabilityCalculator.js

Study in this order:

1. Adaptive Weights (lines 305-340)
   - Beginner: 30% safety, 25% wave
   - Advanced: 35% wave, 10% safety
   - Why? Different priorities!

2. Individual Scores (lines 400-450)
   - Wave height score: optimal range by skill
   - Wind score: offshore = best
   - Tide score: spot-specific preferences

3. Crowd Prediction (lines 460-520)
   - Weekday vs. weekend
   - Tourist season detection
   - Spot popularity + accessibility

4. Safety Scoring (lines 530-610)
   - Skill-based thresholds
   - Wind warnings, reef hazards
   - Rip current database

5. Session Bonuses (lines 195-215)
   - Favorite spots: +15 points
   - Learned preferences: +10/+5 points
   - Machine learning meets user behavior!
```

**Exercise:**
```javascript
// Test different skill levels:
const calculator = new EnhancedSuitabilityCalculator();

const forecast = {
  waveHeight: 2.5,
  wavePeriod: 12,
  windSpeed: 15,
  windDirection: 270,
  tide: { status: 'Mid' }
};

// Compare outputs:
const beginner = calculator.calculateEnhancedSuitability(
  forecast, spot, { skillLevel: 'Beginner' }
);

const advanced = calculator.calculateEnhancedSuitability(
  forecast, spot, { skillLevel: 'Advanced' }
);

console.log('Beginner score:', beginner.score);
console.log('Advanced score:', advanced.score);
// Same conditions, different scores!
```

---

## 📊 Phase 4: Data Flow Understanding (1 week)

### Complete Request Flow

```
Frontend (React Native)
  ↓
  HTTP GET /api/spots?userId=XXX&skillLevel=Intermediate
  ↓
Backend (Express.js)
  ↓
spotsController.js
  ↓
Check cache (5 min TTL)
  ↓ (if expired)
Spawn Python process
  ↓
spot_recommender_service.py
  ↓
Load Random Forest model (127 MB)
  ↓
Predict for 50+ spots (batch)
  ↓
Return JSON to Node.js
  ↓
Parse predictions
  ↓
FOR EACH spot:
  ↓
EnhancedSuitabilityCalculator
  ↓
Calculate personalized score (0-100)
  ↓
Apply session bonuses (if user has history)
  ↓
Generate recommendations
  ↓
Add safety warnings
  ↓
Sort by score
  ↓
Cache results (5 min)
  ↓
Return to frontend
  ↓
React Native renders SpotCard components
```

**Study Each Step:**
```javascript
// 1. Frontend request:
// SurfApp--frontend/data/surfApi.js (lines 50-90)

// 2. Backend routing:
// surfapp--backend/routes/spots.js

// 3. Controller logic:
// surfapp--backend/controllers/spotsController.js

// 4. ML prediction:
// surfapp--ml-engine/services/spot_predictor.py

// 5. Scoring:
// surfapp--backend/controllers/EnhancedSuitabilityCalculator.js
```

---

## 🎓 Advanced Topics (Optional - 2-3 weeks)

### 1. Model Optimization
**Resources:**
- [Hyperparameter Tuning Guide](https://www.tensorflow.org/tutorials/keras/keras_tuner)
- [Pruning and Quantization](https://www.tensorflow.org/model_optimization)

**Apply to Your Models:**
```python
# Try GridSearchCV on Random Forest:
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, None],
    'min_samples_split': [2, 5, 10]
}

grid_search = GridSearchCV(
    RandomForestRegressor(),
    param_grid,
    cv=5,
    scoring='r2'
)

# Find best hyperparameters for your surf data
```

### 2. Model Monitoring
**Why:** Models degrade over time (concept drift)

**Implement:**
- Prediction logging
- Performance tracking
- Retraining triggers

### 3. A/B Testing
**Compare:**
- Random Forest vs. Gradient Boosting
- LSTM vs. GRU
- 7-day forecast vs. 14-day

---

## 🛠️ Practical Projects to Build

### Project 1: Prediction Accuracy Dashboard
**Goal:** Visualize model performance

**Technologies:** React + Chart.js  
**Data:** `testing/test_results.json`

**Features:**
- R² scores over time
- Actual vs. Predicted scatter plots
- Error distribution histograms

---

### Project 2: Real-time Model Retraining
**Goal:** Auto-retrain when new data available

**Technologies:** Python + Cron/Celery  
**Steps:**
1. Fetch latest weather data daily
2. Append to training dataset
3. Retrain model weekly
4. Compare new model vs. old
5. Deploy if improvement > 2%

---

### Project 3: Spot Recommendation Explainability
**Goal:** "Why did we recommend this spot?"

**Technologies:** SHAP values (for ML interpretability)  
**Implementation:**
```python
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Show user: "This spot scored high because:
# - Perfect offshore wind (+25 points)
# - Wave height matches your preference (+15 points)
# - Low crowd predicted (+10 points)"
```

---

## 📖 Recommended Books (In Order)

1. **Python Machine Learning (Sebastian Raschka)** - Covers scikit-learn, TensorFlow
2. **Hands-On Machine Learning (Aurélien Géron)** - Practical, code-heavy
3. **Deep Learning with Python (François Chollet)** - By Keras creator
4. **Forecasting: Principles and Practice (Rob Hyndman)** - Time-series bible

---

## 🎯 Weekly Study Plan (12-Week Roadmap)

### Weeks 1-3: ML Foundations
- **Week 1:** Python basics + NumPy/Pandas
- **Week 2:** ML concepts (Google ML Crash Course)
- **Week 3:** Scikit-learn fundamentals

### Weeks 4-5: Random Forest Deep Dive
- **Week 4:** Decision trees, ensemble methods
- **Week 5:** Study `train_model.py` + `spot_predictor.py`

### Weeks 6-8: LSTM & Time-Series
- **Week 6:** Neural network basics, RNNs
- **Week 7:** LSTM architecture, TensorFlow/Keras
- **Week 8:** Study `train_wave_forecast_lstm.py` + `forecast_predictor.py`

### Weeks 9-10: Integration & System Design
- **Week 9:** Python-Node.js communication, caching
- **Week 10:** Complete data flow analysis

### Weeks 11-12: Advanced Topics & Projects
- **Week 11:** Model optimization, feature engineering
- **Week 12:** Build prediction accuracy dashboard

---

## 🔥 Daily Practice Routine

### Morning (1 hour)
- Watch one tutorial video
- Read one chapter/article
- Take notes

### Afternoon (1-2 hours)
- Code along with tutorial
- Modify code to experiment
- Break things, fix them

### Evening (30 mins)
- Read your project code
- Ask "Why?" for every line
- Document what you learned

---

## 🤔 Questions to Guide Your Learning

As you study each file, ask:

1. **What problem does this solve?**
   - Why Random Forest AND LSTM? (Different use cases!)

2. **What are the inputs and outputs?**
   - Trace data transformations

3. **Why these hyperparameters?**
   - LSTM(64) vs. LSTM(128)? Why 64?

4. **What could go wrong?**
   - NaN handling, API failures, model drift

5. **How would I improve this?**
   - Better features? More data? Different algorithm?

---

## 💡 Key Insights to Discover

1. **Feature Engineering > Model Complexity**
   - Your 15 engineered features beat complex models with 10 raw features

2. **Domain Knowledge Matters**
   - Surf physics (offshore wind, swell energy) encoded in features

3. **Different Models for Different Tasks**
   - Random Forest: Fast, current conditions, 50+ spots
   - LSTM: Slower, future predictions, time-series

4. **Caching Saves Money**
   - ML inference costs add up (API calls + compute)

5. **Personalization Wins**
   - Session learning + adaptive weights = better UX

---

## 🎓 Free Resources Summary

### Video Courses
- ✅ [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course)
- ✅ [Fast.ai Practical Deep Learning](https://course.fast.ai/)
- ✅ [StatQuest YouTube](https://www.youtube.com/c/joshstarmer)
- ✅ [3Blue1Brown Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi)

### Interactive Platforms
- ✅ [Kaggle Learn](https://www.kaggle.com/learn) - Free, hands-on
- ✅ [Google Colab](https://colab.research.google.com/) - Free GPU for experiments
- ✅ [TensorFlow Playground](https://playground.tensorflow.org/) - Visualize neural nets

### Documentation
- ✅ [Scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- ✅ [TensorFlow Tutorials](https://www.tensorflow.org/tutorials)
- ✅ [Keras Documentation](https://keras.io/)

### Communities
- ✅ [r/MachineLearning](https://www.reddit.com/r/MachineLearning/)
- ✅ [Fast.ai Forums](https://forums.fast.ai/)
- ✅ [Kaggle Discussions](https://www.kaggle.com/discussions)

---

## 🚀 Start Here Tomorrow

**Day 1 Checklist:**
1. ✅ Watch: [3Blue1Brown - What is a neural network?](https://www.youtube.com/watch?v=aircAruvnKk) (19 min)
2. ✅ Read: `surfapp--ml-engine/PATH_AUDIT_REPORT.md` (understand structure)
3. ✅ Run: `python spot_recommender_service.py` (see it work!)
4. ✅ Open: `training/train_model.py` (just read, don't stress)
5. ✅ Create: Learning journal (track questions, insights)

**Day 2-7:**
- Complete Google ML Crash Course Module 1-3
- Install Jupyter Notebook
- Start playing with NumPy arrays

**Week 2:**
- Dive into Random Forest implementation
- Modify `train_model.py` experiments

**Week 3:**
- Start neural networks basics
- Prepare for LSTM deep dive

---

## 💪 Remember

> "I don't understand it fully, but I can make it work."  
> → "I understand why it works, and I can improve it."

This is a **journey**, not a race. Your app already works—now you're learning **why** and **how** to make it better.

Every ML engineer started exactly where you are. The difference between beginners and experts is just time and curiosity.

**You've already built something amazing. Now go understand it! 🚀**

---

## 📬 Need Help?

**Stuck on a concept?**
- Comment in your code with `# TODO: Why does this work?`
- Break it into smaller pieces
- Visualize with plots

**Model not training?**
- Check data shapes (`print(X.shape)` everywhere!)
- Start with toy dataset (10 samples)
- Add logging

**Integration issues?**
- Test Python and Node.js separately
- Use `console.log()` and `print()` liberally
- Check stdout/stderr

---

**Last Tip:** The best way to learn is to **teach**. Once you understand each component, write a comment explaining it to your future self. You'll be surprised how much this helps!

Happy Learning! 🌊📚🚀
