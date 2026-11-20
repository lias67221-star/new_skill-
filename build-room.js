import * as T from 'three';

export const room = new T.Scene();
room.name = 'Skill 库 · 三维书房';
room.background = new T.Color('#392528');

const solids = new Map();
const cube = new T.BoxGeometry(1,1,1);
const sphere = new T.SphereGeometry(1,16,12);
const worldUp = new T.Vector3(0,1,0);
let randomState = 8619;
function random() {
  randomState = (Math.imul(randomState,1664525)+1013904223)>>>0;
  return randomState / 4294967296;
}
function material(color) {
  if (typeof color !== 'string') return color;
  if (!solids.has(color)) solids.set(color,new T.MeshStandardMaterial({color,roughness:.84}));
  return solids.get(color);
}
function group(name,parent=room,x=0,y=0,z=0) {
  const part = new T.Group();
  part.name = name;
  part.position.set(x,y,z);
  parent.add(part);
  return part;
}
function mesh(parent,name,geometry,color,x,y,z,sx=1,sy=1,sz=1) {
  const part = new T.Mesh(geometry,material(color));
  part.name=name;
  part.position.set(x,y,z);
  part.scale.set(sx,sy,sz);
  part.castShadow=true;
  part.receiveShadow=true;
  parent.add(part);
  return part;
}
function box(p,name,x,y,z,w,h,d,c){
  return mesh(p,name,cube,c,x,y,z,w,h,d);
}
function ellipsoid(p,name,x,y,z,w,h,d,c){
  return mesh(p,name,sphere,c,x,y,z,w/2,h/2,d/2);
}
function cylinder(p,name,x,y,z,r1,r2,h,c,segments=16) {
  return mesh(p,name,new T.CylinderGeometry(r1,r2,h,segments),c,x,y,z);
}
function rod(p,name,a,b,r,c){
  const start=new T.Vector3(...a), end=new T.Vector3(...b);
  const direction=end.clone().sub(start);
  const center=start.addScaledVector(direction,.5);
  const part=cylinder(p,name,center.x,center.y,center.z,r,r,direction.length(),c,10);
  part.quaternion.setFromUnitVectors(worldUp,direction.normalize());
  return part;
}
function rounded(p,name,x,y,z,w,h,d,r,c){
  const a=w/2,b=h/2,s=new T.Shape();
  s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);
  s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);
  s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
  const geometry=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});
  geometry.translate(0,0,-d/2);
  return mesh(p,name,geometry,c,x,y,z);
}
function canvasMap(w,h,paint) {
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  paint(canvas.getContext('2d'),w,h);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.magFilter=T.NearestFilter;
  return texture;
}
function surface(p,name,x,y,z,w,h,map,emissive=0) {
  const mat=new T.MeshStandardMaterial({map,roughness:.85,transparent:true,alphaTest:.35});
  if (emissive) {
    mat.emissive.set('#ffffff');
    mat.emissiveMap=map;
    mat.emissiveIntensity=emissive;
  }
  const result=mesh(p,name,new T.PlaneGeometry(w,h),mat,x,y,z);
  result.castShadow=false;
  return result;
}
function woodMap(base,light,dark) {
  return canvasMap(256,64,(g,w,h)=>{
    g.fillStyle=base;g.fillRect(0,0,w,h);
    for(let i=0;i<92;i++){
      g.fillStyle=i%3===0?light:dark;
      g.fillRect(random()*w,random()*h,9+random()*93,1+Math.floor(random()*2));
    }
  });
}
const walnut=new T.MeshStandardMaterial({map:woodMap('#8b512f','#9a603b','#7c452c'),roughness:.83});
const honey=new T.MeshStandardMaterial({map:woodMap('#af7344','#be8751','#a36841'),roughness:.8});
const pale=new T.MeshStandardMaterial({map:woodMap('#bd884e','#c99355','#ac7646'),roughness:.8});
const deepWood=new T.MeshStandardMaterial({map:woodMap('#502e24','#654030','#492b23'),roughness:.89});
const boards=['#a9734a','#9e6943','#b07a4f','#a47148','#b68153','#9d6845']
  .map((color)=>new T.MeshStandardMaterial({map:woodMap(color,'#c18b5630','#58331e32'),roughness:.88}));
const plaster = color=>new T.MeshStandardMaterial({
  roughness:1,map:canvasMap(320,220,(g,w,h)=>{
    g.fillStyle=color;g.fillRect(0,0,w,h);
    for(let i=0;i<6300;i++){
      g.fillStyle=i%3===0?'#ffca9b19':'#3d252526';
      g.fillRect(random()*w,random()*h,1+random()*7,1+random()*4);
    }
  })
});
const brass='#e4ae64';
const sand='#e0bd91';

const architectureWidth=6, architectureDepth=5.05, architectureHeight=4.1;
function architecture() {
  const structure=group('墙角与木地板');
  box(structure,'地板底板',architectureWidth/2,-.074,architectureDepth/2,architectureWidth,.14,architectureDepth,'#69402a');
  const plankW=.64, plankD=.14;
  for(let z=0,row=0;z<architectureDepth;z+=plankD,row++){
    const d=Math.min(plankD,architectureDepth-z);
    for(let x=row%2?-plankW/2:0;x<architectureWidth;x+=plankW){
      const l=Math.max(x,0),r=Math.min(x+plankW,architectureWidth);
      box(structure,'木地板板条',(l+r)/2,-.014,z+d/2,r-l-.004,.028,d-.004,boards[Math.floor(random()*boards.length)]).castShadow=false;
    }
  }
  const wall=plaster('#91654f'), side=plaster('#785143');
  const window={l:4.13,r:5.07,b:1.15,t:2.55};
  function back(name,x,y,w,h) {
    return box(structure,name,x,y,-.062,w,h,.124,wall);
  }
  back('后墙',window.l/2,architectureHeight/2,window.l,architectureHeight);
  back('后墙窗台下方',(window.l+window.r)/2,window.b/2,window.r-window.l,window.b);
  back('后墙窗眉上方',(window.l+window.r)/2,(architectureHeight+window.t)/2,window.r-window.l,architectureHeight-window.t);
  back('后墙窗右侧',(architectureWidth+window.r)/2,architectureHeight/2,architectureWidth-window.r,architectureHeight);
  box(structure,'左墙',-.062,architectureHeight/2,architectureDepth/2,.124,architectureHeight,architectureDepth,side);
  box(structure,'后墙踢脚线',architectureWidth/2,.055,.022,architectureWidth,.11,.044,deepWood);
  box(structure,'左墙踢脚线',.022,.055,architectureDepth/2,.044,.11,architectureDepth,deepWood);

  const glazing=group('推窗与木百叶');
  const sky=canvasMap(108,166,(g,w,h)=>{
    const gradient=g.createLinearGradient(0,0,0,h);
    ['#394377','#716492','#c282a0','#ffbd86','#ec8c60'].forEach((color,i)=>gradient.addColorStop(i/4,color));
    g.fillStyle=gradient;g.fillRect(0,0,w,h);
    for(let row=0;row<3;row++) {
      g.fillStyle=['#9b667f','#76586c','#50475d'][row];
      g.beginPath();g.moveTo(0,h);
      for(let x=0;x<=w+4;x+=5)g.lineTo(x,h*(.64+row*.085)+Math.sin(x*.085+row)*13+random()*10);
      g.lineTo(w,h);g.closePath();g.fill();
    }
  });
  surface(glazing,'窗外晚霞',4.6,1.85,-.157,1.42,1.66,sky,.55);
  for (const x of [4.12,4.6,5.08]) box(glazing,'立窗框',x,1.85,.005,.052,1.46,.085,walnut);
  for (const y of [1.14,1.70,2.56]) box(glazing,'横窗框',4.6,y,.005,1.01,.057,.085,walnut);
  box(glazing,'凸出窗台',4.6,1.118,.06,1.11,.071,.20,honey);
  for(let i=0;i<8;i++) {
    const slat=box(glazing,'百叶片',4.6,2.522-i*.066,.072,1.01,.023,.095,i%2?honey:walnut);
    slat.rotation.x=-.24;
  }
  for(const x of [4.25,4.97]) rod(glazing,'百叶拉绳',[x,2.56,.127],[x,1.98,.127],.002,'#554339');
}

const bookColors=['#91543b','#b58043','#536160','#7a5468','#936546','#3f6463','#a57042','#687343'];
function book(parent,x,y,z,height,width,depth,color) {
  const b=group('立放书籍',parent,x,y,z);
  box(b,'书封',0,height/2,0,width,height,depth,color);
  box(b,'书页',0,height/2,-.011,width*.66,height*.91,depth*.91,'#d3b68d');
  box(b,'书脊',0,height/2,depth*.5,width,height,.014,color);
  box(b,'书脊烫金线',0,height*.79,depth*.5+.008,width*.8,.013,.003,brass);
  box(b,'书脊底线',0,height*.16,depth*.5+.008,width*.83,.009,.003,brass);
  return b;
}
function books(parent,x,y,z,count) {
  for(let i=0;i<count;i++){
    const w=.044+random()*.02;
    book(parent,x+w/2,y,z,.16+random()*.16,w,.15+random()*.035,bookColors[i%bookColors.length]);
    x+=w+.008;
  }
}
function stack(p,x,y,z,count) {
  for(let i=0;i<count;i++){
    const s=group('水平叠放的书',p,x+(random()-.5)*.06,y+i*.042,z);
    s.rotation.y=(random()-.5)*.18;
    box(s,'硬书封',0,.02,0,.244,.039,.18,bookColors[(i+1)%bookColors.length]);
    box(s,'书页',0,.02,.004,.224,.026,.176,'#d7b38a');
  }
}
function handle(p,x,y,z,w=.095) {
  box(p,'黄铜把手底板',x,y,z,w,.032,.014,'#624025');
  rod(p,'黄铜提手',[x-w*.36,y,z+.012],[x+w*.36,y,z+.012],.008,brass);
}
function vine(parent,x,y,z,size) {
  const p=group('垂藤',parent,x,y,z);
  for(let strand=0;strand<4;strand++){
    let a=[(strand-1.5)*.061,0,(strand%2)*.028];
    for(let i=0;i<9;i++) {
      const b=[a[0]+(random()-.5)*.085,a[1]-size*(.035+random()*.06),a[2]+.008];
      rod(p,'藤枝',a,b,.005,'#486038');
      for (const sign of [-1,1]) {
        const leaf=ellipsoid(p,'绿叶',b[0]+sign*.024,b[1]+random()*.025,b[2]+.014,.073,.038,.024,
          ['#566d32','#758a3d','#9d9343','#44582d'][Math.floor(random()*4)]);
        leaf.rotation.z=sign*(.35+random()*.6);
      }
      a=b;
    }
  }
}
function plant(parent,x,y,z,scale=1) {
  const p=group('盆栽',parent,x,y,z);
  p.scale.setScalar(scale);
  cylinder(p,'陶土花盆',0,.081,0,.083,.061,.162,'#a66b49',12);
  cylinder(p,'花盆口沿',0,.149,0,.089,.089,.027,'#bf8258',12);
  cylinder(p,'泥土',0,.165,0,.07,.07,.01,'#4b322b',12);
  for(let i=0;i<14;i++){
    const angle=i*2.4, r=.044+random()*.12;
    const a=[0,.16,0],b=[Math.sin(angle)*r,.22+random()*.18,Math.cos(angle)*r];
    rod(p,'叶茎',a,b,.004,'#6d8041');
    const leaf=ellipsoid(p,'绿叶',...b,.044,.138,.025,['#516c35','#7d883c','#a09847','#668044'][i%4]);
    leaf.quaternion.setFromUnitVectors(worldUp,new T.Vector3(b[0]*1.65,.12,b[2]*1.65).normalize());
  }
}

export const skillBooks = [];
export const hotspots = {};
function shelf() {
  // Local X is the width of the shelf. Its front faces into the room along +X.
  const p=group('靠左墙的落地书架',room,.235,0,1.71);
  p.rotation.y=Math.PI/2;
  const w=2.76, d=.39, h=2.40;
  box(p,'连续背板',0,h/2,-d/2,w,h,.042,deepWood);
  for(const x of [-1.36,-.93,.93,1.36])box(p,'垂直立柱',x,h/2,0,.05,h,d,walnut);
  for(const y of [.09,.39,.78,1.20,1.62,2.02,2.38]) {
    box(p,'水平层板',0,y,0,w,.064,d,honey);
    box(p,'层板前缘',0,y,.199,w,.048,.021,walnut);
  }
  for(let i=0;i<5;i++){
    const x=-1.09+i*.542;
    box(p,'底部抽屉柜',x,.228,.049,.52,.214,.33,walnut);
    box(p,'抽屉面',x,.232,.224,.486,.18,.028,honey);
    handle(p,x,.275,.247,.10);
  }
  books(p,-1.28,2.415,.02,9);books(p,.75,2.415,.02,8);
  books(p,-1.28,.423,.01,5);stack(p,1.12,.423,.02,3);
  for(let row=0;row<2;row++)for(let i=0;i<12;i++){
    const x=-.814+i*.148;
    const height=.274 + ((row*12+i)*7%9)*.005;
    const b=book(p,x,row===0?1.652:.812,.073,height,.111,.184,bookColors[i%bookColors.length]);
    b.visible=row===0&&i<6;
    skillBooks.push(b);
  }
  const sign=group('Skill 库灯牌',p,-.08,2.32,.24);
  rounded(sign,'灯牌木边框',0,0,.006,.99,.305,.058,.027,walnut);
  const light=canvasMap(352,106,(g,w,h)=>{
    g.fillStyle='#522a1d';g.fillRect(0,0,w,h);
    g.strokeStyle='#f8bf68';g.lineWidth=7;g.strokeRect(7,7,w-14,h-14);
    g.fillStyle='#ffe2a4';g.font='bold 54px sans-serif';
    g.fillText('Skill 库',120,74);
    g.strokeStyle='#ffdc95';g.lineWidth=5;
    g.beginPath();g.moveTo(42,31);g.lineTo(72,39);g.lineTo(101,31);g.lineTo(101,69);
    g.lineTo(72,77);g.lineTo(42,69);g.closePath();g.moveTo(72,39);g.lineTo(72,77);g.stroke();
    for(let i=0;i<3;i++){
      g.beginPath();g.moveTo(48,41+i*7);g.lineTo(64,45+i*7);g.moveTo(80,45+i*7);g.lineTo(95,41+i*7);g.stroke();
    }
  });
  surface(sign,'灯牌字面',0,0,.036,.94,.258,light,.52);
  hotspots.sign=sign;
  hotspots.shelf=p;
  hotspots.upload=group('上传入口',p,.34,1.405,.237);
  vine(p,-1.32,2.68,.18,.62);vine(p,1.28,2.69,.23,.76);
}

function wallDecor() {
  const p=group('墙面置物架');
  for(const [x,y,w] of [[2.03,2.19,1.26],[3.56,2.30,.9]]) {
    box(p,'悬挂搁板',x,y,.148,w,.06,.296,honey);
    for(const side of [-1,1]){
      const a=x+side*w*.37;
      box(p,'搁板固定木条',a,y-.111,.029,.045,.19,.042,walnut);
      rod(p,'搁板斜撑',[a,y-.182,.044],[a,y-.037,.224],.018,'#855033');
    }
  }
  books(p,1.49,2.222,.166,11);stack(p,2.47,2.222,.175,3);
  for(let i=0;i<2;i++) {
    const x=3.37+i*.39;
    box(p,'高处储物盒',x,2.448,.145,.325,.232,.255,i?'#655250':'#4e4a59');
    box(p,'储物盒盖',x,2.567,.145,.348,.028,.276,i?'#826962':'#696575');
    handle(p,x,2.485,.282,.096);
  }
  vine(p,2.58,2.39,.27,.46);
  const board=group('Prompt 提示词板',room,3.52,1.56,.061);
  box(board,'木边框',0,0,0,.825,.65,.065,walnut);
  const map=canvasMap(250,194,(g,w,h)=>{
    g.fillStyle='#ad7045';g.fillRect(0,0,w,h);
    g.fillStyle='#744126';g.fillRect(0,0,w,46);
    g.fillStyle='#ffe1a0';g.font='bold 24px sans-serif';g.fillText('Prompt 提示词',17,33);
    ['#eed39a','#eac662','#e4aa7c'].forEach((color,i)=>{
      g.save();g.translate(55+i*69,109+(i%2)*15);g.rotate([.13,-.09,.19][i]);
      g.fillStyle='#704431';g.fillRect(-21,-24,55,66);g.fillStyle=color;g.fillRect(-26,-28,55,66);
      g.fillStyle='#8d6842';
      for(let j=0;j<3;j++){g.fillRect(-19,-18+j*14,34,3);g.fillRect(-19,-13+j*14,26,2);}
      g.fillStyle='#7e5251';g.beginPath();g.arc(0,-25,4,0,Math.PI*2);g.fill();
      g.restore();
    });
  });
  surface(board,'软木板与便签',0,0,.035,.778,.597,map);
  hotspots.prompt=board;
}

function desk() {
  const p=group('主书桌',room,2.18,0,.64);
  box(p,'水平桌面',0,.765,0,1.99,.083,.79,honey);
  box(p,'前沿包边',0,.753,.40,1.99,.067,.027,walnut);
  for(const x of [-.90,.90])for(const z of [-.32,.32])box(p,'垂直桌腿',x,.362,z,.064,.724,.071,walnut);
  box(p,'前围板',0,.679,.34,1.76,.112,.053,walnut);
  box(p,'后围板',0,.613,-.326,1.76,.13,.055,deepWood);
  box(p,'桌侧抽屉柜',.61,.35,-.009,.42,.70,.58,walnut);
  for(let i=0;i<3;i++){
    box(p,'抽屉面',.61,.145+i*.193,.287,.378,.168,.026,honey);
    handle(p,.61,.17+i*.193,.308);
  }

  const display=group('显示器与支架',p,.145,.809,-.16);
  rounded(display,'矩形底座',0,.018,.02,.33,.036,.23,.013,'#292632');
  box(display,'直立支柱',0,.148,-.005,.064,.245,.043,'#35323d');
  rounded(display,'显示器外壳',0,.40,.014,.755,.466,.083,.036,'#29232b');
  rounded(display,'显示器边框',0,.404,.058,.726,.432,.014,.024,'#785442');
  const screen=canvasMap(320,182,(g,w,h)=>{
    const backdrop=g.createLinearGradient(0,0,w,h);
    backdrop.addColorStop(0,'#173854');backdrop.addColorStop(1,'#152240');
    g.fillStyle=backdrop;g.fillRect(0,0,w,h);
    g.fillStyle='#274865';g.fillRect(0,0,w,21);
    for(let i=0;i<8;i++){g.fillStyle=['#58c0f3','#eab280','#8f8eda'][i%3];g.fillRect(9+i*10,8,5,5);}
    g.fillStyle='#d2e9ff';g.font='bold 23px sans-serif';g.fillText('我的电脑',23,56);
    g.fillStyle='#be842f';g.fillRect(114,83,38,12);
    g.fillStyle='#e1a74a';g.fillRect(114,93,84,46);
    g.fillStyle='#fcce6e';g.fillRect(118,100,76,34);
    g.fillStyle='#486bad';g.fillRect(164,107,20,20);
    g.fillStyle='#a8c6eb';g.fillRect(168,112,12,3);g.fillRect(168,120,12,3);
    g.fillStyle='#f3e8d0';g.font='bold 16px sans-serif';g.fillText('MCP 工具库',112,162);
  });
  surface(display,'发光显示屏',0,.404,.067,.698,.395,screen,.49);
  hotspots.monitor=display.children[2];

  const keyboard=group('机械键盘',p,.07,.81,.18);
  box(keyboard,'键盘外壳',0,.014,0,.44,.028,.143,'#2a2b3c');
  for(let r=0;r<5;r++)for(let c=0;c<15;c++)
    box(keyboard,'实体键帽',-.194+c*.027,.034,-.052+r*.025,.022,.011,.019,
      c<5?'#bba3ad':c<11?'#8298b5':'#589fc1').castShadow=false;
  ellipsoid(p,'鼠标',.426,.834,.194,.081,.051,.117,'#365a7b');

  const robot=group('机器人小u',p,-.65,.809,.115);
  rounded(robot,'机器人机身',0,.092,0,.185,.14,.116,.032,'#bfc8c9');
  for(const x of [-.065,.065])ellipsoid(robot,'圆形脚垫',x,.029,.051,.066,.060,.072,'#e6c6ae');
  rounded(robot,'机器人头部外壳',0,.218,.002,.235,.168,.15,.037,'#d8c6b7');
  rounded(robot,'机器人黑色面屏',0,.219,.081,.172,.119,.012,.023,'#171f2a');
  const cyan=new T.MeshStandardMaterial({color:'#5ccaf2',emissive:'#38c4f1',emissiveIntensity:.65});
  for(const x of [-.038,.038]){
    box(robot,'发光眼睛',x,.229,.090,.026,.03,.004,cyan);
    box(robot,'眼睛亮像素',x-.004,.235,.093,.011,.012,.002,'#c4f7ff');
  }
  box(robot,'发光表情',0,.198,.090,.032,.006,.003,cyan);
  for(const x of [-.12,.12])ellipsoid(robot,'侧耳',x,.218,.004,.029,.063,.043,'#6696a6');
  cylinder(robot,'天线',.053,.323,-.019,.006,.006,.054,'#747882');
  ellipsoid(robot,'天线球',.053,.353,-.019,.027,.027,.027,'#e5c18d');
  hotspots.robot=robot;

  const lamp=group('可调节台灯',p,-.75,.807,-.265);
  cylinder(lamp,'台灯底盘',0,.012,0,.097,.097,.024,'#44383c');
  rod(lamp,'下支架',[0,.031,0],[-.033,.337,0],.016,'#51423d');
  rod(lamp,'上支架',[-.033,.337,0],[.128,.546,.048],.015,'#51423d');
  ellipsoid(lamp,'转轴',-.033,.337,0,.052,.052,.051,'#645047');
  const shade=group('倾斜灯罩',lamp,.158,.542,.071);
  shade.rotation.z=.30;shade.rotation.x=-.24;
  cylinder(shade,'金属灯罩',0,0,0,.052,.122,.096,'#44383d',18);
  const luminous=new T.MeshStandardMaterial({color:'#ffcf82',emissive:'#ffb758',emissiveIntensity:1.2});
  cylinder(shade,'灯罩出光口',0,-.047,0,.110,.110,.009,luminous,18);
  const taskLight=new T.PointLight('#ffc98c',6.0,2.6,2);
  taskLight.position.set(.16,.467,.08);
  lamp.add(taskLight);

  const mug=group('桌面陶瓷杯',p,.63,.813,.18);
  const cupMat=new T.MeshStandardMaterial({color:'#e5bd98',roughness:.55,side:T.DoubleSide});
  const profile=[new T.Vector2(0,0),new T.Vector2(.041,0),new T.Vector2(.047,.011),new T.Vector2(.052,.107),new T.Vector2(.046,.107),new T.Vector2(.042,.012),new T.Vector2(0,.012)];
  mesh(mug,'空心陶瓷杯体',new T.LatheGeometry(profile,22),cupMat,0,0,0);
  mesh(mug,'杯把',new T.TorusGeometry(.027,.008,8,17),cupMat,.059,.054,0);
  cylinder(mug,'杯中咖啡',0,.080,0,.043,.043,.005,'#493028');
  box(mug,'杯面像素标识',0,.061,.050,.033,.027,.002,'#427282');

  const pen=group('笔筒与铅笔',p,-.409,.805,-.073);
  cylinder(pen,'琥珀笔筒',0,.059,0,.060,.047,.118,'#ad7150',12);
  for(let i=0;i<8;i++) {
    const x=(i-3.5)*.011, h=.16+random()*.072;
    rod(pen,'铅笔',[x,.047,0],[x*1.7,h,(random()-.5)*.08],.005,['#e2b065','#a36d54','#84947d'][i%3]);
  }
  stack(p,.792,.805,-.228,3);plant(p,.815,.805,-.077,.66);
}

function rug() {
  const p=group('编织地毯',room,2.40,0,1.99);
  const cloth=canvasMap(344,206,(g,w,h)=>{
    g.fillStyle='#57414b';g.fillRect(0,0,w,h);
    ['#bea287','#ae8358','#ddb57d','#754d46','#c89c69'].forEach((c,i)=>{
      g.strokeStyle=c;g.lineWidth=i%2?3:5;const f=6+i*5;g.strokeRect(f,f,w-2*f,h-2*f);
    });
    for(let row=0;row<4;row++)for(let col=0;col<9;col++){
      const x=42+col*32.4,y=47+row*37;
      g.fillStyle=row%2?'#b4875e':'#ae7651';
      g.beginPath();g.moveTo(x-12,y);g.lineTo(x,y-12);g.lineTo(x+12,y);g.lineTo(x,y+12);g.closePath();g.fill();
      g.fillStyle='#705353';g.fillRect(x-3,y-3,6,6);
    }
    for(let i=0;i<6200;i++){
      g.fillStyle=i%2?'#ffdda82a':'#33222e30';
      g.fillRect(random()*w,random()*h,1+random()*3,1);
    }
  });
  const m=new T.MeshStandardMaterial({map:cloth,roughness:1});
  box(p,'地毯厚边',0,.007,0,2.47,.014,1.50,'#795b57');
  const top=mesh(p,'织物上表面',new T.PlaneGeometry(2.47,1.5),m,0,.015,0);
  top.rotation.x=-Math.PI/2;
  top.castShadow=false;
  for(const side of [-1,1])for(let i=0;i<32;i++){
    box(p,'短穗',side*(1.235+.017),.008,-.718+i*.046,.039,.006,.016,i%3?sand:'#a77e60').castShadow=false;
  }
}
function chair() {
  const p=group('旋转办公椅',room,2.30,.014,1.56);
  p.rotation.y=-.11;
  const dark='#40353b', frame='#5b4542', fabric='#996949';
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    const x=Math.sin(a)*.295,z=Math.cos(a)*.295;
    rod(p,'五爪底盘支脚',[0,.123,0],[x,.080,z],.021,frame);
    cylinder(p,'脚轮固定轴',x,.073,z,.012,.012,.058,frame);
    const wheel=cylinder(p,'实际接触地面的脚轮',x,.040,z,.040,.040,.035,dark,14);
    wheel.rotation.z=Math.PI/2;
    const hub=cylinder(p,'轮毂',x+.019,.040,z,.018,.018,.005,'#795d51',14);
    hub.rotation.z=Math.PI/2;
  }
  cylinder(p,'升降气杆',0,.256,0,.037,.046,.31,'#4e4046');
  const seat=rounded(p,'有厚度的座垫',0,.456,-.018,.48,.461,.105,.065,fabric);
  seat.rotation.x=-Math.PI/2;
  const trim=rounded(p,'座垫下框',0,.404,-.018,.468,.45,.044,.058,frame);
  trim.rotation.x=-Math.PI/2;
  rod(p,'椅背支撑',[0,.41,.126],[0,.68,.253],.030,frame);
  const back=group('略向后仰的椅背',p,0,.755,.235);
  back.rotation.x=.14;
  rounded(back,'椅背外壳',0,0,0,.49,.527,.092,.063,'#775245');
  rounded(back,'椅背背面',0,0,.05,.448,.479,.021,.052,'#4e3a3c');
  rounded(back,'椅背软垫',0,0,-.063,.451,.485,.062,.047,fabric);
  for(const x of [-.224,.224]){
    rod(p,'扶手前支柱',[x,.441,-.149],[x,.662,-.155],.018,frame);
    rod(p,'扶手后支柱',[x,.441,.133],[x,.662,.105],.018,frame);
    rounded(p,'扶手垫',x,.675,-.020,.058,.036,.327,.018,'#ac7f58');
  }
}
function sideCabinet() {
  const p=group('窗下四格储物柜',room,4.36,0,.324);
  box(p,'储物柜主体',0,.469,0,1.18,.894,.53,walnut);
  for(const x of [-.50,.50])for(const z of [-.19,.19])box(p,'方形柜脚',x,.047,z,.088,.093,.084,deepWood);
  box(p,'储物柜台面',0,.929,0,1.252,.075,.592,pale);
  for(const x of [-.282,.282])for(const y of [.284,.674]){
    box(p,'柜门',x,y,.274,.530,.354,.039,honey);
    box(p,'内嵌柜门框',x,y,.297,.473,.301,.014,walnut);
    handle(p,x,y+.05,.311,.105);
  }
  const globe=group('地球灯',p,-.33,.967,.055);
  cylinder(globe,'地球灯底盘',0,.017,0,.106,.107,.034,'#4c3939');
  cylinder(globe,'地球灯支架',0,.092,0,.018,.034,.134,'#795944');
  const map=canvasMap(216,108,(g,w,h)=>{
    g.fillStyle='#d99a54';g.fillRect(0,0,w,h);
    g.fillStyle='#ffe4a1';
    const continents=[
      [[20,24],[40,18],[63,27],[55,42],[44,50],[28,43],[21,35]],
      [[51,51],[66,57],[73,74],[63,94],[56,82],[54,65]],
      [[101,30],[122,20],[172,20],[188,30],[178,48],[147,46],[139,60],[119,47]],
      [[106,45],[123,50],[126,63],[114,81],[105,77],[97,58]],
      [[159,69],[184,64],[196,76],[183,84],[164,83]]
    ];
    for(const land of continents){
      g.beginPath();land.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
    }
    g.strokeStyle='#f7c179';g.lineWidth=1;
    for(let x=0;x<w;x+=18){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
    for(let y=0;y<h;y+=18){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  });
  const globeMat=new T.MeshStandardMaterial({map,emissive:'#ffc887',emissiveMap:map,emissiveIntensity:.49,roughness:.63});
  const earth=ellipsoid(globe,'发光地球仪球面',0,.240,0,.275,.275,.275,globeMat);
  earth.rotation.z=.28;
  const ring=mesh(globe,'黄铜子午环',new T.TorusGeometry(.151,.007,7,32),brass,0,.241,0);
  ring.rotation.z=.30;ring.rotation.y=.29;
  const point=new T.PointLight('#ffd09c',2.1,1.85,2);
  point.position.set(-.03,.28,.04);globe.add(point);
  plant(p,.348,.966,.088,.91);
  stack(p,.08,.97,-.117,2);
  vine(p,.573,1.03,.22,.37);

  hotspots.store=p;
}
function foreground() {
  const p=group('前景两侧边几');
  for(const [x,z] of [[.36,3.14],[4.75,2.82]]){
    box(p,'边几台面',x,.535,z,.62,.081,.57,honey);
    for(const dx of [-.246,.246])for(const dz of [-.217,.217]){
      box(p,'边几垂直桌脚',x+dx,.247,z+dz,.058,.494,.058,walnut);
    }
    box(p,'边几围板',x,.453,z+.218,.51,.091,.043,deepWood);
  }
  plant(p,.35,.58,3.12,1.37);
  stack(p,4.61,.577,2.78,3);
  plant(p,4.91,.58,2.96,.83);
}
function lighting() {
  room.add(new T.HemisphereLight('#fff1d8','#805862',1.76));
  const key=new T.DirectionalLight('#ffca97',2.20);
  key.position.set(3.9,5.8,3.4);
  key.target.position.set(2,0,1.1);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:15});
  key.shadow.bias=-.00047;key.shadow.normalBias=.015;
  room.add(key,key.target);
  const fill=new T.DirectionalLight('#9fc4ff',.43);
  fill.position.set(4,3,-2);
  room.add(fill);
  const p=group('天花吊灯',room,2.58,2.61,.74);
  rod(p,'灯绳',[0,.045,0],[0,architectureHeight-2.61,0],.009,'#413537');
  cylinder(p,'吊灯漏斗灯罩',0,0,0,.090,.226,.149,'#4d3d42',20);
  const glow=new T.MeshStandardMaterial({color:'#ffe5b0',emissive:'#ffb957',emissiveIntensity:1.3});
  cylinder(p,'吊灯发光内面',0,-.075,0,.21,.21,.011,glow,20);
  const pendant=new T.PointLight('#ffbf78',10,5,2);
  pendant.position.set(0,-.155,.03);
  p.add(pendant);
}
architecture();
shelf();
desk();
wallDecor();
rug();
chair();
sideCabinet();
foreground();
lighting();

export const viewTarget = new T.Vector3(2.36,1.32,1.27);
export const initialYaw = .69;
export const initialPitch = .16;
export const orbitLimits = {minYaw:.42,maxYaw:1.11,minPitch:.10,maxPitch:.29};
export const sideYaw = 1.067;
export const orbitRadius = 6.14;
export function setCamera(camera,yaw=initialYaw,pitch=initialPitch){
  yaw=T.MathUtils.clamp(yaw,orbitLimits.minYaw,orbitLimits.maxYaw);
  pitch=T.MathUtils.clamp(pitch,orbitLimits.minPitch,orbitLimits.maxPitch);
  const horizontal=orbitRadius*Math.cos(pitch);
  camera.position.copy(viewTarget);
  camera.position.x+=Math.sin(yaw)*horizontal;
  camera.position.y+=orbitRadius*Math.sin(pitch);
  camera.position.z+=Math.cos(yaw)*horizontal;
  camera.up.copy(worldUp);
  camera.lookAt(viewTarget);
  camera.updateMatrixWorld();
  return camera;
}
export function makeCamera(){
  return new T.PerspectiveCamera(32,1672/941,.075,40);
}
