package com.museocafe.backendmuseo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendMuseoApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendMuseoApplication.class, args);
    }

}
