package mq;

import java.util.UUID;

public abstract class Response {

    private String uniqueID;
    private final long start_time;

    public Response() {
        uniqueID = UUID.randomUUID().toString();
        start_time = System.currentTimeMillis();
    }
    public long getStart_time() {
        return start_time;
    }
    public abstract void on_time_out();

    public boolean match_id(String id) {
        return uniqueID.equals(id);
    }
    public abstract void on_response();
    public String getUniqueID() {
        return uniqueID;
    }
}
