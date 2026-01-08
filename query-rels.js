const db = require("@arangodb").db;
db._useDatabase("lifeos");

const query = `
FOR e IN people_relationships
  FILTER e._from == @from OR e._to == @to
  SORT e.createdAt DESC
  RETURN e`;

const bindVars = { from: "users/dad", to: "users/dad" };
const cursor = db._query(query, bindVars);
print(JSON.stringify(cursor.toArray()));
