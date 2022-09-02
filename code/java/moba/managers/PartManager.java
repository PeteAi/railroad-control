package moba.managers;

import com.mongodb.client.MongoCollection;
import moba.parts.MobaSwitch;
import moba.parts.Part;
import org.bson.Document;

import java.util.ArrayList;

public class PartManager {
    private ArrayList<Part> parts = new ArrayList<>();

    public PartManager() {

    }
    public void loadCollection(MongoCollection<Document> collection) {
        for (Document document : collection.find()) {
            if (document.containsKey("id")) {
                addPart(new MobaSwitch(document));
            }
        }
    }

    public void addPart(Part part) {
        parts.add(part);
    }
    public void removePart(Part part) {
        parts.remove(part);
    }

    public ArrayList<Part> getParts() {
        return parts;
    }
    public Part getPart(int id) {
        return parts.stream().filter(item -> item.id == id).findFirst().orElse(null);
    }
}
