const db = require("@arangodb").db;
db._useDatabase("lifeos");

const id = "11111111-1111-1111-1111-111111111111";
const keyQuery = "FOR u IN users FILTER u.Key == @id RETURN u._key";
const bindVars = { id: id };
const keyCursor = db._query(keyQuery, bindVars);
const userKey = keyCursor.next();

print("Resolved userKey: " + userKey);

if (userKey) {
  const query = `
FOR e IN people_relationships
  FILTER e._from == @from OR e._to == @to
  SORT e.createdAt DESC
  RETURN e`;

  const bindVars2 = { from: "users/" + userKey, to: "users/" + userKey };
  const cursor = db._query(query, bindVars2);
  print(JSON.stringify(cursor.toArray()));
} else {
  print("No userKey found");
}
