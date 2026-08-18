import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(process.cwd());
const requiredPages=[
  '', 'login','register','dashboard','subjects','question-bank','exam','exam/setup','exam/player','exam/result','ai-tutor','leaderboard','achievements','webboard','post/[id]','profile','membership','redeem','settings','admin','admin/users','admin/questions','admin/imports','admin/codes','admin/analytics','admin/moderation','teacher','community'
];
const requiredModels=['User','Account','Session','Question','QuestionRevision','QuestionStatistics','ImportJob','ImportItem','ExamAttempt','OutboxEvent','RewardLedger','Achievement','LeaderboardSnapshot','MembershipPlan','UserMembership','AiTutorUsage','CommunityPost','CommunityAnswer','CommunityReport','TeacherStudentAccess','AuditLog'];

test('WORK 09 route surface is present',()=>{
  for(const route of requiredPages){
    const p=resolve(root,'apps/web/app',route,'page.tsx');
    assert.equal(existsSync(p),true,`missing page ${route || '/'}`);
  }
});

test('canonical Prisma schema covers WORK 01-08 persistent domains',()=>{
  const schema=readFileSync(resolve(root,'packages/db/prisma/schema.prisma'),'utf8');
  for(const model of requiredModels) assert.match(schema,new RegExp(`model\\s+${model}\\s*\\{`),`missing model ${model}`);
  assert.match(schema,/submissionIdempotencyKey\s+String\?/);
  assert.match(schema,/@@unique\(\[userId, sourceType, sourceId, reason\]\)/);
  assert.match(schema,/codeHash\s+String\s+@unique/);
});

test('migration set includes additive complete-domain migration',()=>{
  const p=resolve(root,'packages/db/prisma/migrations/202608170002_complete_domains/migration.sql');
  assert.equal(existsSync(p),true);
  const sql=readFileSync(p,'utf8');
  for(const table of ['QuestionRevision','OutboxEvent','UserMembership','Achievement','AiTutorUsage','CommunityAnswer','TeacherStudentAccess']) {
    assert.ok(sql.includes(`CREATE TABLE "${table}"`),`migration missing ${table}`);
  }
});

test('deployment config does not embed literal production credentials',()=>{
  for(const rel of ['docker-compose.yml','Dockerfile','.github/workflows/ci.yml']){
    const s=readFileSync(resolve(root,rel),'utf8');
    assert.doesNotMatch(s,/Plastic@Surgery|password\s*[:=]\s*["']?[A-Za-z0-9!@#$%^&*]{8,}/i);
  }
});
