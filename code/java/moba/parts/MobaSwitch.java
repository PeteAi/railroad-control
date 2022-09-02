package moba.parts;

import com.mongodb.client.MongoCollection;
import mq.Response;
import org.bson.Document;
import org.json.JSONObject;

//import java.sql.Timestamp;

import static com.mongodb.client.model.Filters.eq;

import static main.main.mongoDB;
import static main.main.mqMessenger;

public class MobaSwitch extends Part{
    //private int state;
    private int type;
    private final int board_addr;
    private final int board_port;
    private int x;
    private int y;
    private double rot;
    private final MongoCollection<Document> collection;
    private final Document updateQuery = new Document();
    private final JSONObject msg_for_can_bus;

    public MobaSwitch(Document document) {
        super(document);
        this.collection = mongoDB.collection;
        this.board_addr = document.getInteger("board_addr");
        this.board_port = document.getInteger("board_port");
        this.msg_for_can_bus = new JSONObject();
        msg_for_can_bus.put("task", "switch");
        msg_for_can_bus.put("board_addr", board_addr);
        msg_for_can_bus.put("board_port", board_port);
    }
    public void switchState(int new_state) {
        msg_for_can_bus.put("state", new_state);

        Response response = new Response() {
            @Override
            public void on_response() {
                setState(new_state);
                System.out.println("Switch "+id+" set to "+new_state);
            }
            @Override
            public void on_time_out() {
                System.out.println("\u001b[31m"+"Response timed out"+"\u001b[0m");
                setState(2);
            }
        };
        mqMessenger.send_msg_get_response(msg_for_can_bus, response);
    }
    private void setState(int setTo) {
        document.put("state", setTo);

        updateDB();
        updateGUI();
    }
    public int getState() {
        return document.getInteger("state");
    }

    private void updateDB() {
        updateQuery.put("$set", document);
        collection.updateOne(collection.find(eq("id", id)).first(), updateQuery);
    }
    private void updateGUI() {
        JSONObject msg_gui_update = new JSONObject();
        msg_gui_update.put("task", "switch");
        msg_gui_update.put("id", id);
        msg_gui_update.put("state", document.getInteger("state"));
        mqMessenger.send_msg_to_node(msg_gui_update.toString());
    }
    public int getBoard_addr() {
        return board_addr;
    }

    public int getBoard_port() {
        return board_port;
    }
}
