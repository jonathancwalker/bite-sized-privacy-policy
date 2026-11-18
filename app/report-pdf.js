// Pure document generation: dependencies and font bytes are supplied locally by the caller.
export async function createReportPdf(data, {PDFDocument, rgb, fontkit, fontBytes}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, {subset:true});
  const supported = new Set(font.getCharacterSet());
  const color = hex => rgb(...[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255));
  const ink=color('#29333e'), blue=color('#4265be'), line=color('#cbd8e5'), paper=color('#ffffff');
  const palette={comfortable:['#205b47','#eef8f2'],concern:['#7d3038','#fff1f2'],clarify:['#6e4d11','#fff8e8'],skipped:['#47566b','#f0f3f7'],unseen:['#29333e','#f6f8fb']};
  const statuses=[['comfortable','Comfortable'],['concern','Concerned'],['clarify','Unsure'],['skipped','Skipped'],['unseen','Not reviewed']];
  const margin=48, width=516, bottom=70;
  let page, y;
  const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not recorded';
  function check(text){
    if([...text].some(char=>!/[\r\n\t]/.test(char)&&!supported.has(char.codePointAt(0)))){
      throw new Error('This policy contains characters the PDF font cannot display. Save as text to preserve the wording.');
    }
    return text;
  }
  function wrap(value,size,maxWidth){
    const text=check(String(value??''));
    const lines=[];
    for(const paragraph of text.split(/\r?\n/).filter(part=>part.trim())){
      let current='';
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        const candidate=current?current+' '+word:word;
        if(font.widthOfTextAtSize(candidate,size)<=maxWidth){current=candidate;continue;}
        if(current){lines.push(current);current='';}
        for(const char of word){
          if(current&&font.widthOfTextAtSize(current+char,size)>maxWidth){lines.push(current);current='';}
          current+=char;
        }
      }
      lines.push(current);
    }
    return lines;
  }
  function text(value,x,baseline,size=12,tint=ink){
    page.drawText(check(String(value)),{x,y:baseline,size,font,color:tint});
  }
  function newPage(){
    page=pdf.addPage([612,792]);
    for(let x=0;x<612;x+=28)page.drawLine({start:{x,y:0},end:{x,y:792},thickness:.35,color:line,opacity:.45});
    for(let yy=8;yy<792;yy+=28)page.drawLine({start:{x:0,y:yy},end:{x:612,y:yy},thickness:.35,color:line,opacity:.45});
    page.drawRectangle({x:32,y:50,width:548,height:672,color:paper,borderColor:line,borderWidth:.7});
    text('plainer',margin,748,19);text('.',margin+font.widthOfTextAtSize('plainer',19),748,19,blue);
    y=694;
  }
  function ensure(height){if(y-height<bottom)newPage();}
  function paragraph(value,size=12,leading=18,tint=ink){
    for(const row of wrap(value,size,width)){ensure(leading);text(row,margin,y-size,size,tint);y-=leading;}
  }
  function heading(value,size=20){ensure(60);paragraph(value,size,size+8);y-=8;}
  function priorityBox(){
    if(!data.priorities.length)return;
    const rows=wrap(data.priorities.join('  /  '),12,width-32), height=50+rows.length*18;
    ensure(height+16);
    page.drawRectangle({x:margin,y:y-height,width,height,color:color('#f0f5ff'),borderColor:line,borderWidth:.7});
    text('Your priorities',margin+16,y-25,15);
    rows.forEach((row,index)=>text(row,margin+16,y-48-index*18,12));
    y-=height+18;
  }
  function stats(){
    ensure(100);
    const gap=8, cell=(width-gap*4)/5;
    statuses.forEach(([status,label],index)=>{
      const x=margin+index*(cell+gap), [fg,bg]=palette[status];
      page.drawRectangle({x,y:y-80,width:cell,height:80,color:color(bg),borderColor:line,borderWidth:.6});
      text(data.totals[status]||0,x+10,y-34,25,color(fg));
      text(label,x+10,y-61,10.5,color(fg));
    });
    y-=104;
  }
  function itemLines(item){
    const lines=[];
    function block(value,size=12,leading=18,label=''){
      if(!value)return;
      if(lines.length)lines.push({text:'',size:0,leading:10});
      if(label)lines.push({text:label,size:11,leading:18,keepWithNext:true});
      for(const row of wrap(value,size,width-32))lines.push({text:row,size,leading});
    }
    block(item.wording,14,21);
    if(item.sourceQuote&&item.sourceQuote.trim()!==item.wording.trim())block(item.sourceQuote,11,16,'Source wording');
    block(item.contextQuote,11,16,'Source context');
    block(item.question,11,16,'Saved question');
    block(item.note,11,16,'Saved note');
    return lines;
  }
  function claim(item){
    const lines=itemLines(item), [fg,bg]=palette[item.status]||palette.unseen;
    let index=0, continued=false;
    while(index<lines.length){
      ensure(138);
      const allowance=y-bottom-58;
      let end=index, used=0;
      while(end<lines.length&&used+lines[end].leading<=allowance){used+=lines[end].leading;end++;}
      if(end<lines.length){
        let tail=lines.slice(end).filter(row=>row.text).length;
        while(end>index&&tail<3){end--;used-=lines[end].leading;if(lines[end].text)tail++;}
      }
      while(end>index&&(lines[end-1].keepWithNext||!lines[end-1].text)){end--;used-=lines[end].leading;}
      if(end===index){newPage();continue;}
      const height=58+used;
      page.drawRectangle({x:margin,y:y-height,width,height,color:paper,borderColor:line,borderWidth:.7});
      page.drawRectangle({x:margin,y:y-height,width:3,height,color:color(fg)});
      page.drawRectangle({x:margin+1,y:y-37,width:width-2,height:36,color:color(bg)});
      const label=(item.label||'Not reviewed')+(continued?' (continued)':'');
      text(label,margin+16,y-24,12,color(fg));
      const topic=wrap(item.topic,10,width-215).join(' ');
      text(topic,margin+width-16-font.widthOfTextAtSize(topic,10),y-24,10);
      let baseline=y-52;
      for(const row of lines.slice(index,end)){
        if(row.text)text(row.text,margin+16,baseline-row.size,row.size);
        baseline-=row.leading;
      }
      y-=height+16;index=end;continued=true;
      if(index<lines.length)newPage();
    }
  }
  newPage();
  pdf.setTitle(data.title);pdf.setAuthor('Plainer');pdf.setSubject('Personal privacy policy review');
  heading(data.title,30);
  paragraph(`${data.reviewed} of ${data.total} reviewed  /  ${date(data.generatedAt)}`,12,20);y-=18;
  priorityBox();stats();
  const items=data.items.filter(item=>item.status!=='comfortable');
  if(items.length){ensure(190);heading('To look at again');for(const item of items)claim(item);}
  else {heading('Nothing left to revisit');paragraph('All reviewed claims were marked Comfortable. Their wording is omitted from this report.');y-=20;}
  heading('About this report',17);
  paragraph(`${data.depth}. ${data.coverage}`,10.5,16);y-=10;
  paragraph('These are personal reactions, not acceptance of the policy or legal advice. AI wording may miss or change meaning. Comfortable claims are counted without repeating their details.',10.5,16);y-=12;
  paragraph(`Source: ${data.source.url||data.source.kind||'Provided policy'}`,10.5,16);
  paragraph(`Source fetched: ${date(data.source.fetchedAt)}${data.source.scope?'  /  '+data.source.scope:''}`,10.5,16);
  const pages=pdf.getPages();
  pages.forEach((sheet,index)=>{
    page=sheet;text('Personal privacy review',margin,28,9);
    const label=`${index+1} / ${pages.length}`;text(label,564-font.widthOfTextAtSize(label,9),28,9);
  });
  return pdf.save();
}
