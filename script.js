const $=x=>document.getElementById(x);
const BACKEND="https://animador-ia-backend.onrender.com";
const templates={animador:["¡ATENCIÓN, ATENCIÓN, SEÑORES Y SEÑORAS!","¡No te lo puedes perder! ¡Te esperamos!"],fiesta:["¡¡¡PREPÁRATE PARA LA FIESTA!!!","¡¡¡QUE EMPIECE LA FIESTA!!!"],comercial:["Atención a todos nuestros amigos y clientes.","Los esperamos. ¡No faltes!"],orquesta:["¡Señoras y señores, amantes de la buena música!","¡Recibamos este gran espectáculo con un fuerte aplauso!"]};
let selectedImage=null;
function fallbackScript(b,style,energy){let t=b,s=templates[style]||templates.animador;if(energy==="Explosiva")t=t.replace(/[.,]/g,"!!!");else if(energy==="Media")t=t.replace(/\./g,"!");return `${s[0]}\n\n${t}\n\n${s[1]}`}

$("imageInput").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")){setImageStatus("Selecciona una imagen válida.",true);return}if(f.size>8*1024*1024){setImageStatus("La imagen supera 8 MB. Elige una más pequeña.",true);return}selectedImage=f;const u=URL.createObjectURL(f);$("imagePreview").src=u;$("imagePreview").hidden=false;$("imageEmpty").hidden=true;$("removeImage").hidden=false;setImageStatus("Imagen lista. Si el texto está vacío, la IA usará la imagen para crear el guion.");};
$("removeImage").onclick=()=>{selectedImage=null;$("imageInput").value="";$("imagePreview").hidden=true;$("imagePreview").removeAttribute("src");$("imageEmpty").hidden=false;$("removeImage").hidden=true;setImageStatus("")};
function setImageStatus(t,error=false){$("imageStatus").textContent=t;$("imageStatus").className="status "+(error?"error":"success")}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}

$("generate").onclick=async()=>{const b=$("brief").value.trim(),style=$("style").value,energy=$("energy").value.toLowerCase();if(!b&&!selectedImage){$("script").value="Escribe los datos del anuncio o sube una imagen publicitaria.";return}$("script").value="🎙️ Preparando...";setImageStatus("");try{let r,d;if(selectedImage&&!b){const dataUrl=await fileToDataURL(selectedImage);setImageStatus("🖼️ Analizando la publicidad...");r=await fetch(BACKEND+"/api/generate-script-from-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:dataUrl,style,energy})})}else{r=await fetch(BACKEND+"/api/generate-script",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brief:b,style,energy})})}d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||"No se pudo generar el guion.");$("script").value=d.script;setImageStatus(selectedImage&&!b?"✅ Guion generado a partir de la imagen.":"")}catch(e){if(selectedImage&&!b){$("script").value="No se pudo analizar la imagen todavía. Revisa que el backend tenga configurada su clave de IA.\n\nTambién puedes escribir los datos manualmente para generar el guion.";setImageStatus(e.message||"Error al analizar la imagen.",true)}else{$("script").value=fallbackScript(b,style,$("energy").value)}}};

$("speak").onclick=()=>{speechSynthesis.cancel();const text=$("script").value.trim();if(!text)return;const u=new SpeechSynthesisUtterance(text),v=speechSynthesis.getVoices();u.voice=v.find(x=>x.lang?.toLowerCase().startsWith("es"))||v[0];u.rate=+$("rate").value;u.pitch=+$("pitch").value;speechSynthesis.speak(u)};
$("stop").onclick=()=>speechSynthesis.cancel();$("copy").onclick=async()=>{await navigator.clipboard.writeText($("script").value);$("copy").textContent="¡Copiado!";setTimeout(()=>$("copy").textContent="Copiar",1200)};
$("rate").oninput=()=>$("rv").textContent=(+$("rate").value).toFixed(2)+"x";$("pitch").oninput=()=>$("pv").textContent=(+$("pitch").value).toFixed(2);

let db,rec,stream,ch=[],editing=null;
let recording=false;
let pendingRecorderToken=0;

function openDB(){return new Promise((ok,no)=>{
  const r=indexedDB.open("AnimadorIA",1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("voices"))r.result.createObjectStore("voices",{keyPath:"id"})};
  r.onsuccess=()=>{db=r.result;ok()};
  r.onerror=()=>no(r.error)
})}

function all(){return new Promise((ok,no)=>{
  const r=db.transaction("voices").objectStore("voices").getAll();
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>no(r.error)
})}

function put(v){return new Promise((ok,no)=>{
  const r=db.transaction("voices","readwrite").objectStore("voices").put(v);
  r.onsuccess=ok;r.onerror=()=>no(r.error)
})}

function del(id){return new Promise((ok,no)=>{
  const r=db.transaction("voices","readwrite").objectStore("voices").delete(id);
  r.onsuccess=ok;r.onerror=()=>no(r.error)
})}

function audioType(file){return file.type||"audio/webm"}

async function saveVoiceBlob(blob,name,id){
  if(!blob || !blob.size) throw Error("La grabación está vacía.");
  await put({id:id||crypto.randomUUID(),name,blob,date:Date.now(),mime:blob.type||"audio/webm"});
  await render();
}

function stopStream(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
}

async function render(){
  const list=await all(),el=$("voices");
  el.innerHTML=list.length?"":"<p>Aún no hay voces almacenadas.</p>";

  list.forEach(v=>{
    const d=document.createElement("div");
    d.className="voice";
    const isRecordingThis=recording && editing===v.id;

    d.innerHTML=`<b>🎙️ ${escapeHtml(v.name)}</b> <span class="ready">${isRecordingThis?"🔴 Grabando...":"● Lista"}</span>
      <div class="meta">${isRecordingThis?"La muestra anterior está oculta mientras grabas una nueva.":"Muestra almacenada localmente"}</div>
      <audio controls preload="none" ${isRecordingThis?"hidden":""}></audio>
      <div>
        <button data-r="${v.id}">${isRecordingThis?"⏹ Detener":"🔄 Regrabar"}</button>
        <button data-u="${v.id}" ${isRecordingThis?"disabled":""}>📁 Reemplazar archivo</button>
        <button class="danger" data-d="${v.id}" ${isRecordingThis?"disabled":""}>🗑️ Eliminar</button>
      </div>`;
    const audio=d.querySelector("audio");
    if(!isRecordingThis) audio.src=URL.createObjectURL(v.blob);
    el.appendChild(d);
  });

  el.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
    if(confirm("¿Eliminar esta voz almacenada?")){
      await del(b.dataset.d);
      if(editing===b.dataset.d) cancelRecorder();
      else await render();
    }
  });

  el.querySelectorAll("[data-r]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.r;
    if(recording && editing===id){stopRecording();return}
    await openRecorder(id);
  });

  el.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>openRecorder(b.dataset.u));
}

function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

async function openRecorder(id=null){
  if(recording) return;
  editing=id;
  const list=await all();
  const existing=list.find(v=>v.id===id);

  $("voiceName").value=existing?.name||"";
  $("consent").checked=false;
  $("recTitle").textContent=existing?"Regrabar voz":"Nueva voz";
  $("record").textContent="🎙️ GRABAR MUESTRA";
  $("status").textContent=existing
    ?"Listo para regrabar. La muestra anterior se conservará hasta que termines correctamente."
    :"Listo para grabar o subir un archivo.";
  $("recorder").hidden=false;
  await render();
}

$("addVoice").onclick=()=>openRecorder();

function cancelRecorder(){
  pendingRecorderToken++;
  stopStream();
  if(rec && rec.state!=="inactive"){try{rec.onstop=null;rec.stop()}catch{}}
  rec=null;ch=[];recording=false;
  $("record").textContent="🎙️ GRABAR MUESTRA";
  $("recorder").hidden=true;
  $("audioInput").value="";
  render();
}

$("cancel").onclick=cancelRecorder;

async function stopRecording(){
  if(!rec || rec.state!=="recording") return;
  $("status").textContent="⏳ Procesando la grabación...";
  $("record").textContent="⏳ GUARDANDO...";
  rec.stop();
}

$("record").onclick=async()=>{
  if(recording){await stopRecording();return}

  if(!$("consent").checked){
    $("status").textContent="Marca la autorización primero.";
    return;
  }

  const name=$("voiceName").value.trim();
  if(!name){
    $("status").textContent="Escribe un nombre para la voz.";
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia){
    $("status").textContent="Este navegador no permite acceder al micrófono.";
    return;
  }

  const token=++pendingRecorderToken;

  try{
    $("status").textContent="🎙️ Solicitando permiso para usar el micrófono...";
    $("record").textContent="⏳ PREPARANDO...";

    // This call triggers the browser's microphone permission prompt when permission
    // has not already been granted.
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{
        channelCount:1,
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true
      }
    });

    if(token!==pendingRecorderToken){stopStream();return}

    ch=[];
    const preferred=[
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4"
    ];
    const mime=preferred.find(x=>window.MediaRecorder?.isTypeSupported?.(x))||"";

    rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    recording=true;

    // Hide the old player immediately and show the recording state.
    await render();

    rec.ondataavailable=e=>{if(e.data?.size)ch.push(e.data)};

    rec.onerror=()=>{
      $("status").textContent="❌ Ocurrió un error durante la grabación.";
    };

    rec.onstop=async()=>{
      const localRec=rec;
      const localStream=stream;
      const parts=ch.slice();

      rec=null;
      stream=null;
      recording=false;
      ch=[];

      localStream?.getTracks().forEach(t=>t.stop());

      $("record").textContent="🎙️ GRABAR MUESTRA";

      try{
        const blob=new Blob(parts,{type:localRec?.mimeType||"audio/webm"});
        if(!blob.size) throw Error("La grabación está vacía.");

        await saveVoiceBlob(blob,name,editing);
        $("status").textContent="✅ Muestra guardada correctamente.";
        $("recorder").hidden=true;
      }catch(err){
        $("status").textContent="❌ No se pudo guardar la grabación.";
        await render();
      }
    };

    rec.start(250);
    $("record").textContent="⏹ DETENER GRABACIÓN";
    $("status").textContent="🔴 Grabando... Habla ahora.";
  }catch(e){
    stopStream();
    rec=null;
    recording=false;
    $("record").textContent="🎙️ GRABAR MUESTRA";

    if(e?.name==="NotAllowedError" || e?.name==="PermissionDeniedError"){
      $("status").textContent="❌ El micrófono no fue autorizado. Revisa el permiso de micrófono del navegador para esta página.";
    }else if(e?.name==="NotFoundError"){
      $("status").textContent="❌ No se encontró un micrófono disponible.";
    }else{
      $("status").textContent="❌ No se pudo acceder al micrófono.";
    }
    await render();
  }
};

$("audioInput").onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file)return;

  if(!$("consent").checked){
    $("status").textContent="Marca la autorización primero.";
    e.target.value="";
    return;
  }

  const name=$("voiceName").value.trim()||"Mi voz";

  if(file.size>15*1024*1024){
    $("status").textContent="El archivo supera 15 MB.";
    e.target.value="";
    return;
  }

  if(!file.type.startsWith("audio/")){
    $("status").textContent="Selecciona un archivo de audio válido.";
    e.target.value="";
    return;
  }

  try{
    await saveVoiceBlob(file,name,editing);
    $("recorder").hidden=true;
    $("status").textContent="✅ Archivo de voz guardado correctamente.";
  }catch(err){
    $("status").textContent="❌ No se pudo guardar el archivo.";
  }
  e.target.value="";
};

openDB().then(render);

