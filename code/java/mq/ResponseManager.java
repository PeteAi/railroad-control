package mq;

import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;
import java.util.concurrent.TimeUnit;

public class ResponseManager implements Runnable{
    private static List<Response> responses = new ArrayList<>();

    @Override
    public void run() {
        while (true) {
            try {
                long time = System.currentTimeMillis();
                ListIterator<Response> iter = responses.listIterator();
                while (iter.hasNext()) {
                    Response response = iter.next();
                    if(time - response.getStart_time() > 2000) {
                        response.on_time_out();
                        iter.remove();
                    }
                }
                TimeUnit.MILLISECONDS.sleep(500);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public void ack_response(String id) {
        Response response = responses.stream().filter(res -> res.match_id(id)).findFirst().orElse(null);
        if (response!=null) {
            response.on_response();
            responses.remove(response);
        } else {
            System.err.println("Response not found");
        }

    }
    public void add_response(Response response) {
        responses.add(response);
    }
    public int get_response_queue_size() {
        return responses.size();
    }
}
