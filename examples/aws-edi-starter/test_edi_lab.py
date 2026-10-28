import tempfile, unittest, zipfile
from pathlib import Path
from edi_lab import SAMPLE,parse_edi,process

class EnrollmentTests(unittest.TestCase):
    def test_parse(self):
        result=parse_edi(SAMPLE)
        self.assertEqual(result["member_count"],1)
        self.assertEqual(result["members"][0]["id"],"TEST001")
        self.assertEqual(result["members"][0]["coverage"][0]["start"],"2026-11-01")
    def test_zip(self):
        with tempfile.TemporaryDirectory() as folder:
            z=Path(folder)/"test.zip"
            with zipfile.ZipFile(z,"w") as archive:archive.writestr("synthetic.edi",SAMPLE)
            self.assertEqual(process(z,Path(folder)/"result.json")["member_count"],1)
if __name__=="__main__":unittest.main()
