// Configura estos dos valores con los datos de tu proyecto Supabase.
const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_PUBLIC_KEY";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PEGA_AQUI") && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let casesCache = [];

$("year").textContent = new Date().getFullYear();
$("connectionLabel").textContent = configured ? "Conectando con Supabase…" : "Pendiente de configurar Supabase";

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3200)}
function message(id,text,isError=false){$(id).textContent=text;$(id).style.color=isError?"#b34b4b":"#2c8b83"}
function showAuth(){ $("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("logoutBtn").classList.add("hidden"); }
function showApp(){ $("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("logoutBtn").classList.remove("hidden"); }
function setTab(tab){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $("loginForm").classList.toggle("hidden",tab!=="login");$("registerForm").classList.toggle("hidden",tab!=="register");
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db){message("loginMessage","Primero configura Supabase siguiendo el README.",true);return}
  const data=Object.fromEntries(new FormData(e.currentTarget));
  const {error}=await db.auth.signInWithPassword({email:data.email,password:data.password});
  if(error){message("loginMessage",error.message,true);return}
  await loadSession();
});
$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db){message("registerMessage","Primero configura Supabase siguiendo el README.",true);return}
  const data=Object.fromEntries(new FormData(e.currentTarget));
  const {data:result,error}=await db.auth.signUp({email:data.email,password:data.password,options:{data:{full_name:data.full_name,document_id:data.document_id,phone:data.phone}}});
  if(error){message("registerMessage",error.message,true);return}
  message("registerMessage",result.session?"Cuenta creada. Accediendo…":"Cuenta creada. Revisa tu correo para confirmar el registro.");
  if(result.session) await loadSession();
});
$("logoutBtn").addEventListener("click",async()=>{if(db)await db.auth.signOut();currentUser=null;currentProfile=null;showAuth()});

async function loadSession(){
  if(!db)return;
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){showAuth();return}
  currentUser=user;
  const {data:profile,error:profileError}=await db.from("profiles").select("*").eq("id",user.id).single();
  if(profileError){toast("No se pudo cargar tu perfil.");console.error(profileError);return}
  currentProfile=profile;
  $("welcomeUser").textContent=`Hola, ${profile.full_name||user.email}`;
  const isAdmin=profile.role==="gestora";
  $("rolePill").textContent=isAdmin?"GESTORA":"CLIENTE";
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",!isAdmin));
  $("connectionLabel").textContent="Conectado de forma segura";
  showApp();await refreshCases();showPanel("dashboard");
}
async function refreshCases(){
  if(!db||!currentUser)return;
  let query=db.from("expedientes").select("id,reference,category,title,description,status,created_at,updated_at,client_id,profiles:client_id(full_name),documentos(id,file_name,storage_path)").order("created_at",{ascending:false});
  // RLS filtra automáticamente: el cliente solo recibe sus expedientes; la gestora recibe todos.
  const {data,error}=await query;
  if(error){console.error(error);toast("No se pudieron cargar los expedientes.");return}
  casesCache=data||[];renderCases();
}
function formatDate(value){return new Date(value).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"})}
function cardHTML(c,admin=false){
  const owner=admin?`<div class="client-name">${escapeHTML(c.profiles?.full_name||"Cliente")}</div>`:"";\n  const docs=(c.documentos||[]).length?`<div class="doc-list">📎 ${(c.documentos||[]).map(d=>`<button class="doc-link" data-download="${escapeHTML(d.storage_path)}">${escapeHTML(d.file_name)}</button>`).join(" · ")}</div>`:"";
  const status=`<span class="status" data-status="${escapeHTML(c.status)}">${escapeHTML(c.status)}</span>`;
  const controls=admin?`<div class="admin-case-actions"><select aria-label="Cambiar estado" data-status-select="${c.id}">${["Recibido","En revisión","Esperando documentación","En tramitación","Finalizado","Cancelado"].map(s=>`<option ${s===c.status?"selected":""}>${s}</option>`).join("")}</select><button class="btn btn-primary" data-save-status="${c.id}">Guardar</button></div>`:status;
  return `<article class="case-card"><div><div class="case-top"><span class="case-ref">${escapeHTML(c.reference)}</span><span class="case-ref">${escapeHTML(c.category)} · ${formatDate(c.created_at)}</span></div><h3>${escapeHTML(c.title)}</h3><p>${escapeHTML((c.description||"").slice(0,180))}</p>${owner}${docs}</div>${controls}</article>`;
}
function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderCases(){
  const isAdmin=currentProfile?.role==="gestora";
  const active=casesCache.filter(c=>!["Finalizado","Cancelado"].includes(c.status)).length;
  $("statActive").textContent=active;
  $("statDocs").textContent=casesCache.filter(c=>c.status==="Esperando documentación").length;
  $("statDone").textContent=casesCache.filter(c=>c.status==="Finalizado").length;
  $("recentCases").innerHTML=casesCache.slice(0,3).map(c=>cardHTML(c)).join("")||'<div class="empty">Todavía no tienes expedientes. Puedes iniciar una solicitud cuando quieras.</div>';
  $("allCases").innerHTML=casesCache.map(c=>cardHTML(c)).join("")||'<div class="empty">Todavía no hay expedientes.</div>';
  if(isAdmin)renderAdmin();
}
async function downloadDocument(path){
  const {data,error}=await db.storage.from("expediente-documentos").createSignedUrl(path,60);
  if(error){toast("No se pudo abrir el documento.");console.error(error);return}
  window.open(data.signedUrl,"_blank","noopener");
}
document.addEventListener("click",e=>{
  const path=e.target.dataset.download;
  if(path)downloadDocument(path);
});
function renderAdmin(){
  const term=($("adminSearch").value||"").toLowerCase(),status=$("adminStatus").value;
  const filtered=casesCache.filter(c=>(!status||c.status===status)&&(`${c.reference} ${c.title} ${c.profiles?.full_name||""} ${c.profiles?.email||""}`).toLowerCase().includes(term));
  $("adminCases").innerHTML=filtered.map(c=>cardHTML(c,true)).join("")||'<div class="empty">No hay expedientes que coincidan.</div>';
}
$("adminSearch").addEventListener("input",renderAdmin);$("adminStatus").addEventListener("change",renderAdmin);
$("adminCases").addEventListener("click",async e=>{
  const id=e.target.dataset.saveStatus;if(!id)return;
  const status=document.querySelector(`[data-status-select="${id}"]`).value;
  const {error}=await db.from("expedientes").update({status}).eq("id",id);
  if(error){toast("No se pudo actualizar el estado.");console.error(error);return}
  toast("Estado actualizado.");await refreshCases();
});
function showPanel(name){
  ["dashboard","cases","newcase","admin"].forEach(p=>$(`${p}Panel`).classList.toggle("hidden",p!==name));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  const titles={dashboard:"Mi espacio",cases:"Mis expedientes",newcase:"Nueva solicitud",admin:"Gestión interna"};
  $("viewTitle").textContent=titles[name]||"Mi espacio";
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPanel(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showPanel(b.dataset.goto)));

$("caseForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!db||!currentUser){message("caseMessage","Inicia sesión para enviar una solicitud.",true);return}
  const form=e.currentTarget,data=new FormData(form),files=[...(form.elements.documents.files||[])];
  const allowed=["application/pdf","image/jpeg","image/png"];
  for(const file of files){if(!allowed.includes(file.type)||file.size>10*1024*1024){message("caseMessage",`Archivo no permitido o superior a 10 MB: ${file.name}`,true);return}}
  const {data:created,error}=await db.from("expedientes").insert({client_id:currentUser.id,category:data.get("category"),title:data.get("title"),description:data.get("description")}).select("id").single();
  if(error){message("caseMessage",error.message,true);return}
  for(const file of files){
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${currentUser.id}/${created.id}/${crypto.randomUUID()}-${safeName}`;
    const {error:uploadError}=await db.storage.from("expediente-documentos").upload(path,file,{upsert:false,contentType:file.type});
    if(uploadError){console.error(uploadError);toast(`Expediente creado, pero falló ${file.name}. Contacta con la gestoría.`);continue}
    const {error:docError}=await db.from("documentos").insert({expediente_id:created.id,uploaded_by:currentUser.id,storage_path:path,file_name:file.name,mime_type:file.type,size_bytes:file.size});
    if(docError){console.error(docError);toast("Archivo subido, pero no se pudo registrar en el expediente.");}
  }
  form.reset();message("caseMessage","Solicitud enviada correctamente. La gestoría revisará tu expediente.");
  await refreshCases();showPanel("cases");
});
async function init(){
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(console.warn);
  if(!db){$("connectionLabel").textContent="Configura Supabase para activar el portal";return}
  db.auth.onAuthStateChange((_event,session)=>{if(session&&!currentUser)setTimeout(loadSession,0);if(!session&&currentUser){currentUser=null;showAuth()}});
  await loadSession();
}
init();
