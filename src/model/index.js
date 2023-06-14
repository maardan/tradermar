import * as mongodb from 'mongodb';
const MongoClient = mongodb.MongoClient;
const dbName = 'bias';

export const getBias = async (dbTable) => {
    const client = await MongoClient.connect(url, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    }).catch((err) => {
        console.log(err);
    });
    // specify the DB's name
    const db = client.db(dbName);
    // execute find query
    const items = await db.collection(dbTable).find({}).toArray();
    // close connection
    client.close();

    return items;
};

export const createNewBias = async (dbTable, bias) => {
    const client = await MongoClient.connect(url, { useUnifiedTopology: true }, (err, db) => {
        if (err) throw err;
        const dbo = db.db(dbName);
        dbo.collection(dbTable).insertMany(bias, (err, res) => {
            if (err) throw err;
            console.log(res);
            db.close();
        });
    }).catch((err) => {
        console.log(err);
    });

    client.close();
    console.log(`DONE inserting into ${dbTable}`);
    return client;
};
