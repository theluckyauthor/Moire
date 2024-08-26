# This is the backend of the project. and is being hosted on replit at this backend URL [insert your backend URL after entering secrets keys]

import os
import tempfile
from io import BytesIO
from typing import Tuple

import anthropic
import replicate
import requests
from dotenv import load_dotenv
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Set up various AI tools
openai = OpenAI()  # automatically gets OPENAI_API_KEY from secrets in replit
anthropic_client = anthropic.Anthropic(
)  # automatically gets ANTHROPIC_API_KEY from secrets in replit
labs11 = ElevenLabs(
    api_key=os.getenv(
        "ELEVENLABS_API_KEY"),  # Make sure to set this in your .env file
)


@app.route('/')
def hello():
    return "Welcome to the server template!"


# Endpoint for generating a response from OpenAI
@app.route('/openai/text', methods=['POST'])
def openai_generate_text():
    data = request.json
    prompt = data.get('prompt', '') if data else ''
    if not prompt or len(prompt) < 1:
        return jsonify({'error': 'Please provide a prompt'}), 400

    try:
        completion = openai.chat.completions.create(
            model="gpt-4-0613",  # Make sure this is a valid model name
            messages=[{
                "role": "system",
                "content": "You are a helpful assistant."
            }, {
                "role": "user",
                "content": f"{prompt}"
            }])
        response = completion.choices[0].message.content.strip()
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# New endpoint for transcribing audio using OpenAI's Whisper
@app.route('/openai/transcribe', methods=['POST'])
def transcribe_audio() -> Tuple[Response, int]:
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename:
        try:
            # Get the file extension (default to .tmp if no extension)
            file_ext = os.path.splitext(file.filename)[1] or '.tmp'

            # Create a temporary file to store the uploaded audio
            with tempfile.NamedTemporaryFile(delete=False,
                                             suffix=file_ext) as temp_file:
                file.save(temp_file.name)
                temp_filename = temp_file.name

            # Transcribe the audio file
            with open(temp_filename, "rb") as audio_file:
                transcript = openai.audio.transcriptions.create(
                    model="whisper-1", file=audio_file)

            # Delete the temporary file
            os.unlink(temp_filename)

            return jsonify({"transcription": transcript.text}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # This should never be reached, but it's here to satisfy the type checker
    return jsonify({"error": "Unknown error"}), 500


# New endpoint for generating images using OpenAI
@app.route('/openai/image', methods=['POST'])
def openai_generate_image():
    data = request.json
    prompt = data.get('prompt', '') if data else ''
    if not prompt or len(prompt) < 1:
        return jsonify({'error': 'Please provide a prompt'}), 400

    try:
        response = openai.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        return jsonify({"image_url": image_url})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Endpoint for generating a response from Anthropic
@app.route('/anthropic/text', methods=['POST'])
def anthropic_generate_text():
    data = request.json
    prompt = data.get('prompt', '') if data else ''
    if not prompt or len(prompt) < 1:
        return jsonify({'error': 'Please provide a prompt'}), 400
    try:
        message = anthropic_client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            temperature=0,
            system="You are a helpful assistant.",
            messages=[{
                "role": "user",
                "content": prompt
            }])

        # Extract the text content from the response
        response = message.content[0].text if message.content else ""

        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Endpoint for generating an image from Flux model
@app.route('/flux/image', methods=['POST'])
def flux_generate_image():
    data = request.json
    prompt = data.get('prompt', '') if data else ''
    if not prompt or len(prompt) < 1:
        return jsonify({'error': 'Please provide a prompt'}), 400
    try:
        image_urls = replicate.run("black-forest-labs/flux-schnell",
                                   input={
                                       "prompt": prompt,
                                       "num_outputs": 1,
                                       "aspect_ratio": "1:1",
                                       "output_format": "webp",
                                       "output_quality": 80
                                   })

        if image_urls and isinstance(image_urls, list) and len(image_urls) > 0:
            image_url = image_urls[0]
            return jsonify({"image_url": image_url})
        else:
            return jsonify({"error":
                            "No image URL returned from the model"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Endpoint for generating speech from text using ElevenLabs
@app.route('/elevenlabs/speech', methods=['POST'])
def elevenlabs_text_to_speech():
    data = request.json
    prompt = data.get('prompt', '') if data else ''
    voice_id = 'pMsXgVXv3BLzUgSXRplE'  # Default voice ID

    if not prompt or len(prompt) < 1:
        return jsonify({'error': 'Please provide a prompt'}), 400

    try:
        audio_iterator = labs11.text_to_speech.convert(
            voice_id=voice_id,
            optimize_streaming_latency="0",
            output_format="mp3_22050_32",
            text=prompt,
            voice_settings=VoiceSettings(
                stability=0.1,
                similarity_boost=0.3,
                style=0.2,
            ),
        )

        # Concatenate all bytes from the iterator
        audio_bytes = b''.join(audio_iterator)

        # Create a BytesIO object from the concatenated audio content
        audio_io = BytesIO(audio_bytes)

        # Send the file back to the client
        return send_file(audio_io,
                         mimetype='audio/mpeg',
                         as_attachment=True,
                         download_name='tts_output.mp3')

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Starts the Python server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
