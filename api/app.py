from flask import Flask, jsonify
import random
import string
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app,origins=["https://vinaykumarvuppala.github.io/HealthcareEDI834/"])
app = Flask(__name__)

def generate_random_patient_data(num_patients=5):
    # Generate random patient data (replace this with your actual logic)
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
# Define a route for the root URL
@app.route('/')
def index():
    return 'Welcome to the Healthcare EDI Processor'

@app.route('/get_healthcare_data', methods=['GET'])
def get_healthcare_data():
    try:
        data = generate_random_patient_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)

