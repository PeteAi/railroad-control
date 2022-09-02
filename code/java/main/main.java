package main;

import database.MongoDB;
import moba.cli.Cli;
import moba.managers.PartManager;
import moba.parts.MobaSwitch;
import mq.MqMessenger;
import mq.Response;
import mq.ResponseManager;

import java.io.IOException;

public class main {
    public static PartManager partManager;
    public static MqMessenger mqMessenger;
    public static MongoDB mongoDB;
    public static ResponseManager responseManager;

    public static void main(String[] args) {
        mongoDB = new MongoDB();
        responseManager = new ResponseManager();
        partManager = new PartManager();

        partManager.loadCollection(mongoDB.collection);

        mqMessenger = new MqMessenger("amqp://admin:admin@moba.local:5672");

        //System.out.println(partManager.getParts().size());


        Cli cli = new Cli();
        Thread cliThread = new Thread(cli);
        cliThread.start();


        Thread responseThread = new Thread(responseManager);
        responseThread.start();


        mqMessenger.start_consuming_messages();

    }
}
