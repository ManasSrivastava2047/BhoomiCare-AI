const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite Database
const db = new sqlite3.Database('./bhoomicare.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Create tables
function initializeDatabase() {
  const createTables = `
    CREATE TABLE IF NOT EXISTS user_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_name TEXT NOT NULL,
      location TEXT NOT NULL,
      sowing_date TEXT,
      crop_stage TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weather_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      temperature REAL,
      humidity INTEGER,
      rainfall REAL,
      wind_speed REAL,
      weather_description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_id INTEGER,
      response_type TEXT,
      response_text TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (query_id) REFERENCES user_queries (id)
    );

    CREATE TABLE IF NOT EXISTS pest_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_name TEXT NOT NULL,
      pest_name TEXT NOT NULL,
      severity TEXT,
      description TEXT,
      prevention TEXT,
      season TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(createTables, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized');
      seedPestData();
    }
  });
}

// Seed pest data
function seedPestData() {
  const pestData = [
    {
      crop: 'Rice',
      pest: 'Brown Planthopper',
      severity: 'High',
      description: 'Small brown insects that suck plant juices, causing yellowing and stunted growth',
      prevention: 'Use resistant varieties, maintain proper water levels, apply neem oil spray',
      season: 'Monsoon'
    },
    {
      crop: 'Wheat',
      pest: 'Aphids',
      severity: 'Medium',
      description: 'Small green/black insects that cluster on leaves and stems',
      prevention: 'Regular monitoring, use ladybird beetles, spray with soapy water',
      season: 'Winter'
    },
    {
      crop: 'Cotton',
      pest: 'Bollworm',
      severity: 'High',
      description: 'Caterpillars that bore into cotton bolls, reducing yield significantly',
      prevention: 'Use pheromone traps, Bt cotton varieties, biological control agents',
      season: 'Summer'
    },
    {
      crop: 'Sugarcane',
      pest: 'Red Rot',
      severity: 'High',
      description: 'Fungal disease causing red discoloration and hollow stems',
      prevention: 'Use disease-free seeds, proper drainage, crop rotation',
      season: 'Monsoon'
    },
    {
      crop: 'Maize',
      pest: 'Fall Armyworm',
      severity: 'High',
      description: 'Caterpillars that feed on leaves, causing significant damage to young plants',
      prevention: 'Early detection, use of pheromone traps, biological pesticides',
      season: 'Monsoon'
    }
  ];

  const insertPest = db.prepare(`
    INSERT OR IGNORE INTO pest_alerts (crop_name, pest_name, severity, description, prevention, season)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  pestData.forEach(pest => {
    insertPest.run(pest.crop, pest.pest, pest.severity, pest.description, pest.prevention, pest.season);
  });

  insertPest.finalize();
}

// Weather API integration
async function getWeatherData(location) {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=metric`
    );
    
    return {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      rainfall: response.data.rain ? response.data.rain['1h'] || 0 : 0,
      windSpeed: response.data.wind.speed,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    // Return mock data if API fails
    return {
      temperature: 28,
      humidity: 65,
      rainfall: 0,
      windSpeed: 8,
      description: 'partly cloudy',
      icon: '02d'
    };
  }
}

// AI-powered recommendations (simulated)
function generateAIRecommendations(cropData, weatherData) {
  const { cropName, location, sowingDate, cropStage } = cropData;
  const { temperature, humidity, rainfall, windSpeed, description } = weatherData;

  // Irrigation advice
  let irrigationAdvice = '';
  if (rainfall > 5) {
    irrigationAdvice = `🌧️ Recent rainfall detected (${rainfall}mm). Skip irrigation for 2-3 days. Monitor soil moisture levels.`;
  } else if (humidity < 40) {
    irrigationAdvice = `💧 Low humidity (${humidity}%). Increase irrigation frequency. Water early morning or evening.`;
  } else if (temperature > 35) {
    irrigationAdvice = `🌡️ High temperature (${temperature}°C). Provide adequate water and consider mulching to retain moisture.`;
  } else {
    irrigationAdvice = `💧 Normal irrigation schedule recommended. Water every 2-3 days based on soil moisture.`;
  }

  // Crop care advice
  let cropCareAdvice = '';
  const currentMonth = new Date().getMonth() + 1;
  
  if (cropName.toLowerCase().includes('rice')) {
    if (currentMonth >= 6 && currentMonth <= 9) {
      cropCareAdvice = `🌾 Monsoon season for rice. Ensure proper drainage to prevent waterlogging. Watch for blast disease.`;
    } else {
      cropCareAdvice = `🌾 Maintain water levels at 2-3 inches. Apply nitrogen fertilizer in split doses.`;
    }
  } else if (cropName.toLowerCase().includes('wheat')) {
    if (currentMonth >= 11 || currentMonth <= 3) {
      cropCareAdvice = `🌾 Optimal wheat growing season. Apply phosphorus at sowing and nitrogen in 2-3 splits.`;
    } else {
      cropCareAdvice = `🌾 Off-season for wheat. Consider summer crops like maize or cotton.`;
    }
  } else {
    cropCareAdvice = `🌾 Monitor crop regularly for pests and diseases. Apply balanced fertilizer as per soil test.`;
  }

  // Weather-based alerts
  let weatherAlert = '';
  if (windSpeed > 15) {
    weatherAlert = `⚠️ High wind speed (${windSpeed} km/h). Provide support to tall crops and check for physical damage.`;
  } else if (temperature < 10) {
    weatherAlert = `❄️ Low temperature alert. Protect sensitive crops from cold damage.`;
  } else if (humidity > 80 && temperature > 25) {
    weatherAlert = `🦠 High humidity and temperature favor fungal diseases. Apply preventive fungicide spray.`;
  }

  return {
    irrigation: irrigationAdvice,
    cropCare: cropCareAdvice,
    weatherAlert: weatherAlert || '✅ Weather conditions are favorable for crop growth.'
  };
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Submit crop query
app.post('/api/crop-query', async (req, res) => {
  try {
    const { cropName, location, sowingDate, cropStage } = req.body;

    // Insert user query
    const queryResult = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_queries (crop_name, location, sowing_date, crop_stage) VALUES (?, ?, ?, ?)',
        [cropName, location, sowingDate, cropStage],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Get weather data
    const weatherData = await getWeatherData(location);

    // Store weather data
    db.run(
      'INSERT INTO weather_data (location, temperature, humidity, rainfall, wind_speed, weather_description) VALUES (?, ?, ?, ?, ?, ?)',
      [location, weatherData.temperature, weatherData.humidity, weatherData.rainfall, weatherData.windSpeed, weatherData.description]
    );

    // Generate AI recommendations
    const recommendations = generateAIRecommendations(
      { cropName, location, sowingDate, cropStage },
      weatherData
    );

    // Store AI responses
    Object.entries(recommendations).forEach(([type, text]) => {
      db.run(
        'INSERT INTO ai_responses (query_id, response_type, response_text) VALUES (?, ?, ?)',
        [queryResult, type, text]
      );
    });

    res.json({
      success: true,
      queryId: queryResult,
      weather: weatherData,
      recommendations
    });

  } catch (error) {
    console.error('Error processing crop query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pest alerts for specific crop
app.get('/api/pest-alerts/:crop', (req, res) => {
  const cropName = req.params.crop;
  const currentMonth = new Date().getMonth() + 1;
  let season = 'Summer';
  
  if (currentMonth >= 6 && currentMonth <= 9) season = 'Monsoon';
  else if (currentMonth >= 10 || currentMonth <= 2) season = 'Winter';

  db.all(
    'SELECT * FROM pest_alerts WHERE crop_name LIKE ? OR season = ? ORDER BY severity DESC',
    [`%${cropName}%`, season],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

// Get weather forecast (mock 7-day forecast)
app.get('/api/weather-forecast/:location', async (req, res) => {
  try {
    const location = req.params.location;
    const currentWeather = await getWeatherData(location);
    
    // Generate mock 7-day forecast
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toLocaleDateString('en-IN'),
        temperature: currentWeather.temperature + (Math.random() * 6 - 3),
        humidity: currentWeather.humidity + (Math.random() * 20 - 10),
        rainfall: Math.random() * 10,
        description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
      });
    }

    res.json({
      current: currentWeather,
      forecast
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather forecast' });
  }
});

// Get dashboard analytics
app.get('/api/dashboard', (req, res) => {
  const queries = {
    totalQueries: 'SELECT COUNT(*) as count FROM user_queries',
    popularCrops: 'SELECT crop_name, COUNT(*) as count FROM user_queries GROUP BY crop_name ORDER BY count DESC LIMIT 5',
    recentQueries: 'SELECT * FROM user_queries ORDER BY timestamp DESC LIMIT 10'
  };

  const results = {};
  let completed = 0;

  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, (err, rows) => {
      if (!err) {
        results[key] = key === 'totalQueries' ? rows[0].count : rows;
      }
      completed++;
      
      if (completed === Object.keys(queries).length) {
        res.json(results);
      }
    });
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌾 BhoomiCare AI server running on port ${PORT}`);
  console.log(`📱 Access the app at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});