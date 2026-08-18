const test=require("node:test");const assert=require("node:assert/strict");const {FixedWindowRateLimiter,Platform,assertSameOrigin}=require("../dist");
test("security: RBAC prevents student question creation",()=>{const p=new Platform();const s=p.register("s@x","StrongPass!123");assert.throws(()=>p.createQuestion(s,{subject:"THAI",grade:6,difficulty:"BASIC",stem:"x",choices:["a","b"],correct:[0],explanation:"e"}),/FORBIDDEN/)});
test("security: IDOR blocks another student's attempt",()=>{const p=new Platform();const a=p.provision("ADMIN","a@x","StrongPass!123"),s1=p.register("1@x","StrongPass!123"),s2=p.register("2@x","StrongPass!123");const q=p.createQuestion(a,{subject:"ENGLISH",grade:6,difficulty:"BASIC",stem:"x",choices:["a","b"],correct:[0],explanation:"e"});p.publishQuestion(a,q.id);const at=p.startExam(s1,"ENGLISH",1,"EXAM");assert.throws(()=>p.answer(s2,at.id,q.id,["c0"]),/IDOR_BLOCKED/)});
test("security: XSS payload is escaped and javascript protocol removed",()=>{const p=new Platform();const s=p.register("s@x","StrongPass!123");const post=p.createPost(s,'<img src=x onerror=alert(1)> javascript:alert(2)');assert.ok(!post.body.includes("<img"));assert.ok(!/javascript:/i.test(post.body))});
test("security: same-origin CSRF guard",()=>{assert.doesNotThrow(()=>assertSameOrigin("https://app.example.com","https://app.example.com"));assert.throws(()=>assertSameOrigin("https://evil.example","https://app.example.com"),/CSRF_ORIGIN_REJECTED/)});
test("security: fixed window brute-force limiter",()=>{const l=new FixedWindowRateLimiter(3,1000);assert.equal(l.check("ip"),true);assert.equal(l.check("ip"),true);assert.equal(l.check("ip"),true);assert.equal(l.check("ip"),false)});


test("security: password baseline rejects weak passwords",()=>{
  const p=new Platform();
  assert.throws(()=>p.register("weak@example.com","short"),/WEAK_PASSWORD/);
});

test("integration: redeem per-user limit is scoped to the current code",()=>{
  const p=new Platform();
  const admin=p.provision("ADMIN","admin2@example.com","StrongPass!123");
  const user=p.register("redeem@example.com","StrongPass!123");
  p.createRedeemCode(admin,"CODEA",30,10,1);
  p.createRedeemCode(admin,"CODEB",30,10,1);
  p.redeem(user,"CODEA",crypto.randomUUID());
  assert.doesNotThrow(()=>p.redeem(user,"CODEB",crypto.randomUUID()));
  assert.throws(()=>p.redeem(user,"CODEA",crypto.randomUUID()),/PER_USER_LIMIT/);
});

 test("security: missing Origin is rejected",()=>assert.throws(()=>assertSameOrigin(undefined,"https://app.test"),/CSRF_ORIGIN_REQUIRED/));
