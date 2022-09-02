package database;
import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import static com.mongodb.client.model.Filters.*;
import org.bson.Document;


public class MongoDB {
    private MongoClient mongoClient;
    private MongoDatabase database;
    public MongoCollection<Document> collection;
    private Block<Document> printBlock = document -> System.out.println(document.toJson());
    public MongoDB() {
        mongoClient = new MongoClient(new MongoClientURI("mongodb://moba.local:27017"));
        database  = mongoClient.getDatabase("moba");
        collection  = database.getCollection("switches");
    }
    public Document getSwitch(int id) {
        //collection.find(eq("id", id)).forEach(printBlock);
        return collection.find(eq("id", id)).first();
    }
}
