import express from "express";
import mysql2 from "mysql2";
import cors from "cors";

const app = express();

const pool = mysql2.createPool({
  host: "34.142.40.170",
  user: "root",
  password: "12345678",
  database: "MPD",
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 1000,
});

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(
    `[${now.split("T").join(" ").slice(0, 16)}] ${req.method} request to ${
      req.url
    }`
  );
  next();
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database as ID:", connection.threadId);
  connection.release();
});

app.get("/", (req, res) => {
  res.json("hello");
});

app.get("/inventory", (req, res) => {
  const q = "SELECT * FROM MPD.inventory";
  pool.query(q, (err, data) => {
    if (err) {
      console.log(err);
      return res.json(err);
    }
    return res.json(data);
  });
});

app.post("/inventory", (req, res) => {
  const q =
    "INSERT INTO MPD.inventory(`item`, `owner`, `location`, `value`, `status`, `createdate`, `comment`, `condition`) VALUES(?)";
  const values = [
    req.body.item,
    req.body.owner,
    req.body.location,
    req.body.value,
    req.body.status,
    req.body.createdate,
    req.body.comment,
    req.body.condition,
  ];
  console.log(req.body);

  pool.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json("Inventory buvo pagaminta");
  });
});

// app.delete("/inventory/:id", (req, res) => {
//   const inventoryId = req.params.id;
//   const q = "DELETE FROM MPD.inventory WHERE id = ?";
//   connection.query(q, [inventoryId], (err, data) => {
//     if (err) return res.json(err);
//     console.log("inventory buvo deletinta");
//     return res.json("inventory buvo deletinta");
//   });
// });

app.put("/inventory/delete/:id", (req, res) => {
  const inventoryId = req.params.id;
  const value = "Removed";
  const q = "UPDATE MPD.inventory SET `status` = ? WHERE id = ?";
  console.log(value);
  console.log(inventoryId);

  pool.query(q, [value, inventoryId], (err, data) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: err });
    }
    console.log("Inventory status updated");
    return res
      .status(200)
      .json({ message: "Inventory item updated successfully" });
  });
});

app.put("/inventory/:id", (req, res) => {
  const inventoryId = req.params.id;
  const q =
    "UPDATE MPD.inventory SET `item` = ?, `owner` = ?, `location` = ?, `value` = ?, `status` = ?, `createdate` = ?, `comment` = ?, `condition` = ? WHERE id = ?";
  const values = [
    req.body.item,
    req.body.owner,
    req.body.location,
    req.body.value,
    req.body.status,
    req.body.createdate,
    req.body.comment,
    req.body.condition,
  ];
  pool.query(q, [...values, inventoryId], (err, data) => {
    if (err) return res.json(err);
    return res.json("inventory buvo updeitinta");
  });
});

app.get("/users", (req, res) => {
  const q =
    "SELECT id, userstatus, type, firstName, lastName, email FROM MPD.users";

  pool.query(q, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "An error occurred while fetching users.",
        error: err,
      });
    }

    return res.status(200).json(data);
  });
});

app.get("/usersFullNames", (req, res) => {
  const q =
    "SELECT id, CONCAT(firstName, ' ', lastName) AS fullName FROM MPD.users;";
  pool.query(q, (err, data) => {
    if (err) {
      console.log(err);
      return res.json(err);
    }
    return res.json(data);
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const q = "SELECT * FROM MPD.users WHERE email = ?";

  pool.query(q, [email], (err, data) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (data.length === 0) {
      return res.status(200).json({ message: "User not found" });
    }

    const user = data[0];

    if (user.password === password) {
      return res.status(200).json({
        message: "Login approved",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          type: user.type,
        },
      });
    } else {
      return res
        .status(200)
        .json({ message: "Login denied, incorrect password" });
    }
  });
});

app.post("/users", (req, res) => {
  const q =
    "INSERT INTO MPD.users(`userstatus`, `password`, `type`, `firstName`, `lastName`, `email`) VALUES(?)";
  console.log(req.body);

  const values = [
    req.body.userstatus,
    req.body.password,
    req.body.type,
    req.body.firstName,
    req.body.lastName,
    req.body.email,
  ];
  pool.query(q, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json("User successfully registered");
  });
});

app.post("/users/comment", (req, res) => {
  const q =
    "INSERT INTO MPD.usercomment(`userID`, `comment`, `author`) VALUES (?, ?, ?)";

  const author =
    req.body.authorizedUser.firstName + " " + req.body.authorizedUser.lastName;

  const values = [req.body.userCommentID, req.body.comment, author];
  console.log(values);

  pool.query(q, values, (err, data) => {
    if (err) {
      console.error("Error inserting comment:", err);
      return res.status(500).json(err);
    }
    return res.status(200).json("User successfully commented");
  });
});

app.get("/usercomments/:id", (req, res) => {
  const userId = req.params.id;

  const q = "SELECT * FROM MPD.usercomment WHERE userId = ?";
  console.log("Fetching comments for user ID:", userId);

  pool.query(q, [userId], (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }
    return res.json(data);
  });
});

app.post("/inventory/transfer", (req, res) => {
  const insertQuery =
    "INSERT INTO MPD.item_transfers(`item_id`, `from_user`, `to_user`, `transfer_comment`, `status`) VALUES(?)";

  const updateQuery = "UPDATE inventory SET status = ? WHERE id = ?";

  const transferValues = [
    req.body.itemID,
    req.body.fromUser,
    req.body.toUser,
    req.body.comment,
    req.body.transferStatus,
  ];

  const updateValues = ["Transfer", req.body.itemID];

  pool.query(insertQuery, [transferValues], (insertErr, insertData) => {
    if (insertErr) {
      return res.status(500).json(insertErr);
    }
    pool.query(updateQuery, updateValues, (updateErr, updateData) => {
      if (updateErr) {
        return res.status(500).json(updateErr);
      }
      return res.json("Transfer was successful, and inventory was updated.");
    });
  });
});

app.get("/inventory/transferlist", (req, res) => {
  const q = `
   SELECT
      item_transfers.*,
      inventory.condition,
      inventory.item,
      CONCAT(toUser.firstName, ' ', toUser.lastName) AS toUserFullName,
      CONCAT(fromUser.firstName, ' ', fromUser.lastName) AS fromUserFullName
    FROM MPD.item_transfers
    JOIN MPD.inventory ON item_transfers.item_id = inventory.id
    JOIN MPD.users AS toUser ON item_transfers.to_user = toUser.id
    JOIN MPD.users AS fromUser ON item_transfers.from_user = fromUser.id
  `;
  pool.query(q, (err, data) => {
    if (err) {
      console.log(err);
      return res.json(err);
    }
    return res.json(data);
  });
});

app.put("/inventory/transfer/accept/:itemID/:transferID", (req, res) => {
  const itemId = req.params.itemID;
  const transferID = req.params.transferID;
  const user = req.body.firstName + " " + req.body.lastName;
  console.log(itemId);
  console.log(transferID);
  console.log(user);

  const updateValuesTransferq =
    "UPDATE MPD.item_transfers SET status = ? WHERE id= ?";
  const updateValuesItemsq =
    "UPDATE MPD.inventory SET owner = ?, status = ? WHERE id = ?";
  const updateValuesTransfer = ["completed", transferID];
  const updateValuesItems = [user, "Active", itemId];

  pool.query(
    updateValuesTransferq,
    updateValuesTransfer,
    (insertErr, transferData) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }
      pool.query(
        updateValuesItemsq,
        updateValuesItems,
        (updateErr, inventoryData) => {
          if (updateErr) {
            return res.status(500).json(updateErr);
          }
          return res.json(
            "Transfer was successful, and inventory was updated."
          );
        }
      );
    }
  );
});

app.put("/inventory/transfer/decline/:itemID/:transferID", (req, res) => {
  const itemId = req.params.itemID;
  const transferID = req.params.transferID;

  const updateValuesTransferq =
    "UPDATE MPD.item_transfers SET status = ? WHERE id= ?";
  const updateValuesItemsq = "UPDATE inventory SET status = ? WHERE id = ?";
  const updateValuesTransfer = ["declined", transferID];
  const updateValuesItems = ["Active", itemId];

  pool.query(
    updateValuesTransferq,
    updateValuesTransfer,
    (insertErr, transferData) => {
      if (insertErr) {
        return res.status(500).json(insertErr);
      }
      pool.query(
        updateValuesItemsq,
        updateValuesItems,
        (updateErr, inventoryData) => {
          if (updateErr) {
            return res.status(500).json(updateErr);
          }
          return res.json(
            "Transfer was successful, and inventory was updated."
          );
        }
      );
    }
  );
});

app.listen(8800, () => {
  console.log("connected to backend");
});
