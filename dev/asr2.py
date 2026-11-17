import sys, sherpa_onnx, soundfile as sf, numpy as np, subprocess, io, os
M = 'sherpa-onnx-whisper-base.en/'
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M+'base.en-encoder.int8.onnx', decoder=M+'base.en-decoder.int8.onnx', tokens=M+'base.en-tokens.txt', language='en', task='transcribe')
def load16(path):
    wav = subprocess.run(['ffmpeg','-loglevel','error','-i',path,'-ar','16000','-ac','1','-f','wav','-'],capture_output=True).stdout
    d, sr = sf.read(io.BytesIO(wav), dtype='float32'); return d
CARRIER = load16(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'carrier.wav')) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'carrier.wav')) else None
def transcribe(path, carrier=False):
    d = load16(path)
    z = lambda n: np.zeros(n, dtype='float32')
    if carrier and CARRIER is not None: d = np.concatenate([CARRIER, z(2400), d])
    d = np.concatenate([z(4000), d, z(8000)])
    s = rec.create_stream(); s.accept_waveform(16000, d); rec.decode_stream(s); return s.result.text.strip()
if __name__ == '__main__':
    c = sys.argv[1] == '-c'
    for p in sys.argv[2 if c else 1:]: print(p, '→', transcribe(p, c))
