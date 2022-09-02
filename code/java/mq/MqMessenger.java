package mq;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import moba.parts.MobaSwitch;
import moba.parts.Part;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.URISyntaxException;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

import static main.main.mqMessenger;
import static main.main.partManager;
import static main.main.responseManager;

public class MqMessenger {
    private final Connection connection;
    private final Channel consume_java_queue;
    private final Channel publish_python_queue_channel;
    private final Channel publish_node_queue_channel;

    public MqMessenger(String url_params) {
        ConnectionFactory factory = new ConnectionFactory();
        try {
            factory.setUri(url_params);
            connection = factory.newConnection();
            // consume java_queue
            consume_java_queue = connection.createChannel();
            consume_java_queue.queueDeclare("java_queue", true, false, false, null);
            // publish python_queue
            publish_python_queue_channel = connection.createChannel();
            publish_python_queue_channel.queueDeclare("python_queue", true, false, false, null);
            // publish java_queue
            publish_node_queue_channel = connection.createChannel();
            publish_node_queue_channel.queueDeclare("node_queue", true, false, false, null);

        } catch (IOException | TimeoutException | URISyntaxException | NoSuchAlgorithmException |
                 KeyManagementException e) {
            System.err.println("ERROR MqMessenger");
            throw new RuntimeException(e);
        }
    }
    public void start_consuming_messages() {
        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            handle_msg_java_queue(new String(delivery.getBody(), "UTF-8"));
        };
        try {
            consume_java_queue.basicConsume("java_queue", true, deliverCallback, consumerTag -> {});
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void handle_msg_java_queue(String msg) {
        JSONObject jsonObject = isValid(msg);
        if (jsonObject == null) {
            System.out.println("\u001b[36m[pika]\033[0m recv " + msg);
            if (msg.equals("New Client")) {
                JSONObject temp = new JSONObject();
                List<JSONObject> sList = new ArrayList<>();
                for (Part part : partManager.getParts()) {
                    sList.add(new JSONObject(part.document.toJson()));
                }
                temp.put("all_parts", sList);
                mqMessenger.send_msg_to_node(temp.toString());
            }
            return;
        }
        if (jsonObject.has("code")) {
            if (jsonObject.getString("code").equals("ok 200")) {
                responseManager.ack_response(jsonObject.getString("msg_id"));
            }
            return;
        }
        if (jsonObject.has("task")) {
            if (jsonObject.getString("task").equals("set_switch")) {
                MobaSwitch tempPart = (MobaSwitch) partManager.getPart(jsonObject.getInt("id"));
                if (tempPart == null) throw new NullPointerException("switch doesn't exist");
                tempPart.switchState(jsonObject.getInt("state"));
            }
        }
    }

    public JSONObject isValid(String json) {
        try {
            return new JSONObject(json);
        } catch (JSONException e) {
            return null;
        }
    }

    public void send_msg(String msg) {
        try {
            publish_python_queue_channel.basicPublish("", "python_queue", null, msg.getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void send_msg_to_node(String msg) {
        try {
            publish_node_queue_channel.basicPublish("", "node_queue", null, msg.getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void send_msg_get_response(JSONObject msg, Response response) {
        msg.put("msg_id", response.getUniqueID());
        responseManager.add_response(response);
        try {
            publish_python_queue_channel.basicPublish("", "python_queue", null, msg.toString().getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public int getResponsesSize() {
        return responseManager.get_response_queue_size();
    }
}
