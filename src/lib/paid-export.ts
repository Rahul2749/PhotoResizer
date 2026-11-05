import type { JobSummary } from "./workflow";
import { downloadName } from "./workflow";
type ReadyImage = NonNullable<JobSummary["result"]>;
async function localBytes(image: ReadyImage) {
  if(!(image.blob instanceof Blob))throw new Error("Process this image in the editor first.");
  return new Uint8Array(await image.blob.arrayBuffer());
}
export async function makePairZip(photo:ReadyImage,signature:ReadyImage) {
  if(photo.bytes+signature.bytes>20_000_000)throw new Error("Use smaller output files for a ZIP on this device.");
  const {zipSync}=await import("fflate");
  const files={ [downloadName("photo",photo.width,photo.height,photo.mime)]:await localBytes(photo),[downloadName("signature",signature.width,signature.height,signature.mime)]:await localBytes(signature) };
  return new Blob([new Uint8Array(zipSync(files,{level:0}))],{type:"application/zip"});
}
export async function makePrintSheet(photo:ReadyImage,widthMm:number,heightMm:number,copies:number) {
  if(!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||widthMm<10||widthMm>150||heightMm<10||heightMm>150||!Number.isInteger(copies)||copies<1||copies>12)throw new Error("Choose tile dimensions from 10–150 mm and 1–12 copies.");
  const columns=Math.floor(193/(widthMm+3)),rows=Math.floor(280/(heightMm+3));
  if(!columns||!rows||copies>columns*rows)throw new Error("That many copies will not fit on one A4 page. Reduce the copy count or tile size.");
  const {PDFDocument,rgb}=await import("pdf-lib");
  const bytes=await localBytes(photo);
  const pdf=await PDFDocument.create();pdf.setTitle("PhotoResizeKaro A4 photo sheet");pdf.setCreator("PhotoResizeKaro");pdf.setProducer("PhotoResizeKaro");
  let image;
  if(photo.mime==="image/jpeg")image=await pdf.embedJpg(bytes);
  else if(photo.mime==="image/png")image=await pdf.embedPng(bytes);
  else{
    const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:photo.mime})),canvas=document.createElement("canvas");let png:Blob;
    try{canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas is unavailable.");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("Could not prepare the print image.")),"image/png"));}finally{bitmap.close();canvas.width=1;canvas.height=1;}
    image=await pdf.embedPng(await png.arrayBuffer());
  }
  const mm=72/25.4,page=pdf.addPage([210*mm,297*mm]);
  const tileW=widthMm*mm,tileH=heightMm*mm,scale=Math.min(tileW/image.width,tileH/image.height),imageW=image.width*scale,imageH=image.height*scale;
  for(let i=0;i<copies;i++){const x=(10+(i%columns)*(widthMm+3))*mm,y=(297-10-heightMm-Math.floor(i/columns)*(heightMm+3))*mm;page.drawRectangle({x,y,width:tileW,height:tileH,borderWidth:.25,borderColor:rgb(.78,.81,.86)});page.drawImage(image,{x:x+(tileW-imageW)/2,y:y+(tileH-imageH)/2,width:imageW,height:imageH});}
  return new Blob([new Uint8Array(await pdf.save())],{type:"application/pdf"});
}
export function saveBlob(blob:Blob,name:string) {const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
