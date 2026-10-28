import zipfile
edi="ST*834*0001~INS*Y*18*021*20*A***FT~REF*0F*TEST001~NM1*IL*1*EXAMPLE*SAM~HD*021**HLT*DEMO-PLAN~DTP*348*D8*20261101~SE*7*0001~"
with zipfile.ZipFile("sample834.zip","w",compression=zipfile.ZIP_DEFLATED) as z:z.writestr("sample.edi",edi)
print("sample834.zip created")
