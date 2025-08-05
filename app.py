from flask import Flask, jsonify, render_template, request
import requests
import os
from flask_cors import CORS

app = Flask(__name__, static_folder='public', template_folder='public', static_url_path='')
CORS(app)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    city = request.args.get('city')

    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "OpenWeatherMap API key is not configured on the server."}), 500

    base_url = "http://api.openweathermap.org/data/2.5/weather"
    params = {
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }

    if lat and lon:
        params["lat"] = lat
        params["lon"] = lon
    elif city:
        params["q"] = city
    else:
        params["q"] = "Motihari" # Default city if no input

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        data = response.json()

        if data.get('cod') == '404':
            return jsonify({"error": "City not found. Please check the spelling."}), 404

        weather_info = {
            "temperature": data['main']['temp'],
            "humidity": data['main']['humidity'],
            "windSpeed": data['wind']['speed'],
            "condition": data['weather'][0]['description'],
            "icon": data['weather'][0]['icon'],
            "city": data['name'] + (f", {data['sys']['country']}" if 'country' in data['sys'] else '')
        }
        return jsonify(weather_info)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Request failed: {str(e)}"}), 500


# 🧠 AI-Powered Endpoints (Gemini-ready placeholders)
# These endpoints now accept crop details to provide more dynamic placeholder responses.
# In a real application, these would call actual AI/ML models.
@app.route('/api/advice')
def get_crop_advice():
    crop_type = request.args.get('cropType', 'wheat')
    growth_stage = request.args.get('growthStage', 'flowering')
    soil_type = request.args.get('soilType', 'loamy')
    observations = request.args.get('observations', 'healthy growth')
    # image_analysis_data = request.args.get('imageAnalysis', {}) # Could pass image analysis data here

    advice = f"For {crop_type} at the {growth_stage} stage on {soil_type} soil: "

    if "yellowing leaves" in observations.lower() or "nutrient deficiency" in observations.lower():
        advice += "Check for nutrient deficiency (e.g., nitrogen, iron) or overwatering. Consider a balanced fertilizer application and ensure proper drainage."
    elif "new shoots" in observations.lower() or "vigorous growth" in observations.lower():
        advice += "Continue regular care. Ensure adequate sunlight and nutrients for vigorous growth. Monitor for early signs of pests."
    elif "pest signs" in observations.lower() or "pest infestation" in observations.lower():
        advice += "Inspect closely for specific pests (e.g., aphids, armyworms). Apply appropriate organic pest control measures immediately."
    elif "healthy growth" in observations.lower():
        advice += "Your crop appears healthy! Continue current practices. Focus on preventative measures for common issues."
    else:
        advice += "Maintain moderate irrigation and monitor fungal growth due to humidity. Consider applying organic fertilizer every two weeks."

    return jsonify({
        "crop": crop_type,
        "growthStage": growth_stage,
        "soilType": soil_type,
        "observations": observations,
        "advice": advice
    })

@app.route('/api/pests')
def get_pest_alerts():
    crop_type = request.args.get('cropType', 'wheat')
    region = request.args.get('region', 'Motihari') # Region could come from weather data or user input
    growth_stage = request.args.get('growthStage', 'flowering')
    observations = request.args.get('observations', '') # Use observations for more specific alerts

    alerts = []
    if "wheat" in crop_type.lower():
        alerts.append("⚠️ Aphid infestation risk due to high humidity.")
        alerts.append("✅ Use neem oil spray every 5 days.")
        if "flowering" in growth_stage.lower():
            alerts.append("🐛 Monitor for armyworms, especially during evening hours, as they can damage developing grains.")
        if "rust" in observations.lower():
            alerts.append("🚨 Rust disease detected. Consider fungicide application or resistant varieties.")
        else:
            alerts.append("🔍 Check for rust disease, common in humid conditions for wheat.")
    elif "rice" in crop_type.lower():
        alerts.append("⚠️ Brown planthopper risk. Inspect leaf bases regularly.")
        alerts.append("✅ Ensure proper water management to deter pests.")
        if "blast" in observations.lower():
            alerts.append("🚨 Rice blast disease detected. Consult local agricultural extension for treatment.")
    elif "corn" in crop_type.lower():
        alerts.append("⚠️ Fall armyworm risk. Inspect whorls for damage.")
        alerts.append("✅ Consider biological control agents for armyworms.")
    else:
        alerts.append(f"General pest alert for {crop_type}: Monitor for common regional pests and diseases.")

    return jsonify({
        "region": region,
        "crop": crop_type,
        "alerts": alerts
    })

@app.route('/api/watering')
def get_watering_schedule():
    crop_type = request.args.get('cropType', 'wheat')
    growth_stage = request.args.get('growthStage', 'flowering')
    soil_type = request.args.get('soilType', 'loamy')
    humidity = request.args.get('humidity', '60') # Assume humidity from weather data

    watering_suggestion = f"💧 For {crop_type} at {growth_stage} stage on {soil_type} soil: "

    if "sandy" in soil_type.lower():
        watering_suggestion += "Water more frequently (e.g., daily or every other day) but with less volume, as sandy soil drains quickly. "
    elif "clay" in soil_type.lower():
        watering_suggestion += "Water less frequently (e.g., every 4-5 days) but deeply, as clay soil retains water well. Avoid waterlogging. "
    else: # Loamy or general
        watering_suggestion += "Water every 3 days early morning. "

    if "germination" in growth_stage.lower():
        watering_suggestion += "Keep soil consistently moist for optimal sprouting, but avoid saturation."
    elif "flowering" in growth_stage.lower():
        watering_suggestion += "Maintain consistent moisture, critical for fruit/grain development. Avoid water stress during this period."
    elif "harvesting" in growth_stage.lower():
        watering_suggestion += "Reduce watering gradually to prepare for harvest and prevent rot. Stop watering completely a week before harvest."
    else:
        watering_suggestion += "Adjust watering based on recent rainfall and soil moisture levels. Ensure soil drainage to prevent waterlogging."

    if float(humidity) > 80:
        watering_suggestion += "High humidity suggests less frequent watering might be needed to prevent fungal diseases."
    elif float(humidity) < 40:
        watering_suggestion += "Low humidity might require slightly more frequent watering."

    return jsonify({
        "crop": crop_type,
        "watering": watering_suggestion
    })

@app.route('/api/analyze-crop-image', methods=['POST'])
def analyze_crop_image():
    if 'crop_image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files['crop_image']
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    # In a real application, you would:
    # 1. Save the file temporarily or stream it.
    # 2. Use an AI Vision API (e.g., Fal AI, Google Cloud Vision, AWS Rekognition, custom ML model)
    #    to analyze the image. This would involve sending the image data to the AI service.
    # 3. Parse the AI model's response to extract relevant insights.

    # For demonstration, we'll simulate an AI analysis based on a simple check.
    # You would replace this with actual AI model integration.
    # Example using Fal AI (requires @fal-ai/serverless in Node.js or a Python client):
    # from fal_ai import FalClient
    # fal_client = FalClient(os.getenv("FAL_KEY"))
    # result = fal_client.run("image_analysis_model", input={"image": file.read()})
    # detected_crop = result["crop_type"]
    # health = result["health_status"]
    # issues = result["detected_diseases"]

    # Simulate different results based on file size or name for demo purposes
    # In a real scenario, this would be actual AI output
    detected_crop_type = "Wheat"
    health_status = "Healthy"
    potential_issues = []

    if "sick" in file.filename.lower():
        health_status = "Unhealthy"
        potential_issues.append("Nutrient Deficiency")
        potential_issues.append("Early Blight")
    elif "pest" in file.filename.lower():
        health_status = "Affected"
        potential_issues.append("Aphid Infestation")
    elif "rice" in file.filename.lower():
        detected_crop_type = "Rice"
        health_status = "Healthy"
    elif "corn" in file.filename.lower():
        detected_crop_type = "Corn"
        health_status = "Healthy"

    return jsonify({
        "detectedCropType": detected_crop_type,
        "healthStatus": health_status,
        "potentialIssues": potential_issues
    })

if __name__ == '__main__':
    app.run(debug=True)
