package moba.parts;

import org.bson.Document;
import org.json.JSONObject;

public abstract class Part {
    public final int id;
    public Document document;
    public Part(Document document) {
        this.document = document;
        this.id = document.getInteger("id");
    }

    public abstract int getState();

    //public abstract void switchState();
    //public abstract void setState(int setTo);
}
