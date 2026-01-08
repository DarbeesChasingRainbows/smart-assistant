const db = require("@arangodb").db;
db._useDatabase("lifeos");

const users = db._collection("users");
const rels = db._collection("people_relationships");

users.truncate();
rels.truncate();

const now = new Date().toISOString();

users.save({
  _key: "dad",
  Key: "11111111-1111-1111-1111-111111111111",
  Email: "dad@family.local",
  Username: "Dad",
  Role: "Parent",
  IsActive: true,
  CreatedAt: now,
  UpdatedAt: now,
});

users.save({
  _key: "mom",
  Key: "22222222-2222-2222-2222-222222222222",
  Email: "mom@family.local",
  Username: "Mom",
  Role: "Parent",
  IsActive: true,
  CreatedAt: now,
  UpdatedAt: now,
});

users.save({
  _key: "child",
  Key: "33333333-3333-3333-3333-333333333333",
  Email: "child@family.local",
  Username: "Child",
  Role: "Child",
  IsActive: true,
  CreatedAt: now,
  UpdatedAt: now,
});

rels.save({
  _key: "dad-mom-spouse",
  _from: "users/dad",
  _to: "users/mom",
  type: "Spouse",
  isValid: true,
  createdAt: now,
  updatedAt: now,
});

rels.save({
  _key: "dad-child-parent",
  _from: "users/dad",
  _to: "users/child",
  type: "Parent",
  isValid: true,
  createdAt: now,
  updatedAt: now,
});

print("seeded users + relationships");
