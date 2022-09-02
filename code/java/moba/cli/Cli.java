package moba.cli;

import moba.parts.MobaSwitch;
import mq.Response;
import org.json.JSONObject;

import static main.main.partManager;
import static main.main.mqMessenger;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;


public class Cli implements Runnable{

    public Cli() {

    }

    @Override
    public void run() {
        System.out.println("CLI Thread is running...");
        System.out.print("cmd: ");
        try (BufferedReader in = new BufferedReader(new InputStreamReader(System.in))) {
            String line;
            while ((line = in.readLine()) != null) {
                String[] cmd_array = line.split(" ");
                switch (cmd_array[0]) {
                    case "exit":
                        System.exit(0);
                    case "publish":
                        mqMessenger.send_msg_to_node(cmd_array[1]);
                        System.out.println("msg published");
                        break;
                    case "s":
                        if (cmd_array.length != 3) {
                            System.out.println("wrong number of args given");
                        } else {
                            try {
                                MobaSwitch tempPart = (MobaSwitch) partManager.getPart(Integer.parseInt(cmd_array[1]));
                                if (tempPart == null) throw new NullPointerException("switch doesn't exist");
                                tempPart.switchState(Integer.parseInt(cmd_array[2]));
                            } catch (NullPointerException e) {
                                System.err.println(e);
                            }
                        }
                        break;
                    case "getResponseQueue":
                        System.out.println("ResponseQueueSize: \u001b[31m" + mqMessenger.getResponsesSize() + "\u001b[0m");
                        break;
                    default:
                        System.out.println("command is not valid!");
                        break;
                }
                System.out.print("cmd: ");
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
