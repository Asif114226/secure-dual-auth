import { PrismaClient, ElectionStatus } from "@prisma/client";
const prisma=new PrismaClient();
async function main(){const e=await prisma.election.upsert({where:{id:"demo-election"},update:{},create:{id:"demo-election",name:"Demo Election (NON-PRODUCTION)",startsAt:new Date(),endsAt:new Date(Date.now()+86400000),status:ElectionStatus.DRAFT}});await prisma.candidate.createMany({data:[{electionId:e.id,name:"Candidate A",symbol:"A",ballotOrder:1},{electionId:e.id,name:"Candidate B",symbol:"B",ballotOrder:2}],skipDuplicates:true});console.log("Seeded",e.id)}
main().finally(()=>prisma.$disconnect());
