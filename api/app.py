from flask import Flask, jsonify, make_response
import random
import string
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app, origins=["https://vinaykumarvuppala.github.io/HealthcareEDI834/"])

def generate_random_patient_data(num_patients=5):
  """Generates random patient data."""
  data = []
  for _ in range(num_patients):
    patient = {
      'id': random.randint(1, 1000),
      'name': ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase, k=8)),
      'age': random.randint(20, 80),
      'diagnosis': random.choice(['Influenza', 'Hypertension', 'Allergies', 'Diabetes'])
    }
    data.append(patient)
  return data

@app.route('/')
def index():
  """Root endpoint."""
  return 'Welcome to the Healthcare EDI Processor'

@app.route('/get_healthcare_data', methods=['GET'])
def get_healthcare_data():
  """Generates and returns random healthcare EDI data."""
  try:
    data = generate_random_patient_data()
    response = make_response(jsonify(data))
    # Set no-cache headers to prevent browser caching
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response
  except Exception as e:
    return jsonify({'error': str(e)})

if __name__ == '__main__':
  app.run(debug=True)
