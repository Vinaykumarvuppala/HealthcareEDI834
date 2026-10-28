import unittest,io,zipfile
from lambda_function import process_event
class FakeS3:
 def __init__(self,data):self.data=data;self.writes=[]
 def get_object(self,**kw):return {"Body":io.BytesIO(self.data)}
 def put_object(self,**kw):self.writes.append(kw)
def pack(name="member.edi"):
 out=io.BytesIO()
 with zipfile.ZipFile(out,"w") as z:z.writestr(name,"INS*Y*18~")
 return out.getvalue()
def event(key="test.zip"):return {"Records":[{"eventSource":"aws:s3","s3":{"bucket":{"name":"raw-demo"},"object":{"key":key}}}]}
class Tests(unittest.TestCase):
 def test_success(self):
  s=FakeS3(pack());r=process_event(event(),s,"stage-demo");self.assertEqual(len(s.writes),1);self.assertEqual(len(r["batches"][0]["extracted_keys"]),1)
 def test_unsafe(self):
  s=FakeS3(pack("../escape.edi"))
  with self.assertRaises(ValueError):process_event(event(),s,"stage-demo")
  self.assertFalse(s.writes)
 def test_wrong_extension(self):
  with self.assertRaises(ValueError):process_event(event("bad.edi"),FakeS3(pack()),"stage-demo")
if __name__=="__main__":unittest.main()
