import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {spawn,execFileSync} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {chromium} from "playwright";
import {encode} from "next-auth/jwt";

export async function proveMultiProviderBrowser(input:{email:string;authSubject:string;revenueId:string;ledgerId:string;providerIds:string[];asOf:string;end:string}) {
  const database=new URL(process.env.DATABASE_URL!);
  if(!["localhost","127.0.0.1"].includes(database.hostname)||!/^\/revory_sprint1_[a-f0-9]{12}$/.test(database.pathname))throw new Error("Browser proof requires disposable local data.");
  const base="http://localhost:3216",auth=randomBytes(32).toString("hex"),output="docs/qa/multi-provider";await mkdir(output,{recursive:true});
  const before=await readFile("next-env.d.ts","utf8"),beforeConfig=await readFile("tsconfig.json","utf8");let log="";
  const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--port","3216","--hostname","127.0.0.1"],{windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,NODE_ENV:"development",AUTH_SECRET:auth,NEXTAUTH_URL:base,NEXT_PUBLIC_APP_URL:base,REVORY_QA_DIST_DIR:".tmp/multi-provider-next",REVORY_AI_COMMERCIAL_ENABLED:"false",AUTH_GOOGLE_CLIENT_ID:"",AUTH_GOOGLE_CLIENT_SECRET:"",RESEND_API_KEY:"",STRIPE_SECRET_KEY:"",OPENAI_API_KEY:""}});
  server.stdout.on("data",value=>{log+=String(value);});server.stderr.on("data",value=>{log+=String(value);});
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  try {
    let ready=false;
    for(let i=0;i<80;i++){if(server.exitCode!==null)throw new Error("Fixture Next server exited.");try{if((await fetch(base+"/api/health",{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
    assert.ok(ready,"Fixture server health");browser=await chromium.launch({headless:true});
    const context=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000}}),page=await context.newPage();const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    const token=await encode({secret:auth,token:{sub:input.authSubject,email:input.email,authProvider:"google"}});
    await context.addCookies([{name:"next-auth.session-token",value:token,domain:"localhost",path:"/",httpOnly:true,sameSite:"Lax"}]);
    async function capture(name:string){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${output}/${name}-desktop.png`,fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}: mobile overflow`);await page.screenshot({path:`${output}/${name}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});}
    await page.goto(base+"/app/ai-integrity/connections",{waitUntil:"networkidle"});await page.getByRole("heading",{name:"Connect the providers your product uses."}).waitFor();
    await page.getByLabel("Source",{exact:true}).selectOption("ANTHROPIC");await page.getByLabel("Dedicated Anthropic Admin API key",{exact:true}).waitFor();assert.ok(await page.getByText(/Admin keys can carry broader permissions/).isVisible());await capture("claude-connection");
    await page.getByLabel("Source",{exact:true}).selectOption("GEMINI");await page.getByLabel("Billing export table",{exact:true}).waitFor();assert.ok(await page.getByText(/Input, cache and batch usage are outside/).isVisible());assert.equal(await page.getByRole("button",{name:"Save authorized connection"}).isEnabled(),false);await capture("gemini-connection");
    await page.getByLabel("Gemini platform",{exact:true}).selectOption("vertex");assert.ok(await page.getByText(/Explicit-cache units remain separate/).isVisible());
    await page.goto(base+"/app/ai-integrity/scans",{waitUntil:"networkidle"});
    const selectors=page.getByRole("combobox");await selectors.nth(0).selectOption(input.revenueId);await selectors.nth(1).selectOption(input.ledgerId);await selectors.nth(2).selectOption(input.providerIds[0]);
    await page.getByRole("checkbox",{name:/^ANTHROPIC/}).check();await page.getByRole("checkbox",{name:/^GEMINI/}).check();
    await page.getByText("Advanced: analysis timestamp",{exact:true}).click();
    const dates=page.locator('input[type="datetime-local"]'),count=await dates.count();assert.equal(count,11);
    for(let index=0;index<count;index++){const field=dates.nth(index);if(await field.isDisabled())continue;await field.fill((index===2||index===count-1?input.asOf:input.end).slice(0,19).replace(/:00$/,"" ));}
    await page.getByRole("spinbutton").fill("48");
    const saved=page.waitForResponse(response=>response.url().endsWith("/api/ai-integrity/report-setup")&&response.request().method()==="POST");await page.getByRole("button",{name:"Save setup for later"}).click();assert.equal((await saved).status(),200);
    await page.getByRole("checkbox",{name:/^I checked that the files/}).check();await page.getByRole("checkbox",{name:/^I am authorized to analyze/}).check();await capture("multi-source-setup");
    const completed=page.waitForResponse(response=>response.url().endsWith("/api/ai-integrity/scans")&&response.request().method()==="POST");await page.getByRole("button",{name:"Create my connected report"}).click();
    const response=await completed;assert.equal(response.status(),200,await response.text());const result=await response.json();assert.ok(result.snapshotId);
    await page.waitForURL("**/app/ai-integrity/reports/*");await page.getByRole("heading",{name:"Sources included in this report"}).waitFor();assert.ok(await page.getByText(/unconnected-provider/).count());await capture("multi-provider-report");
    assert.equal(errors.length,0,errors.join("\n"));
    await writeFile(output+"/browser-proof.json",JSON.stringify({fixtureOnly:true,desktop:1440,mobile:390,connections:["Anthropic","Gemini Developer API","Gemini Vertex AI"],sourcesSubmitted:5,reportCreatedThroughAuthenticatedApi:true,providerScopeVisible:true,unknownProviderVisible:true,googleQueryConsentRequired:true,accountTermsAcceptedByAgent:false,pageErrors:errors,realProviderReads:0,livePayments:0},null,2)+"\n");
    return result.snapshotId as string;
  }finally{
    await browser?.close();if(server.pid&&server.exitCode===null){if(process.platform==="win32"){try{execFileSync("taskkill",["/pid",String(server.pid),"/T","/F"],{stdio:"ignore",windowsHide:true});}catch{}}else server.kill("SIGTERM");}
    await writeFile("next-env.d.ts",before);await writeFile("tsconfig.json",beforeConfig);await writeFile(".tmp/multi-provider-browser.log",log);
  }
}
