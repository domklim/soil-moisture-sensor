#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <TimeLib.h>

const char *ssid = "";
const char *pass = "";

const int AnalogIn  = A0;
int readSensor;

const char ntpServerName[] = "us.pool.ntp.org";
const int timeZone = 2;

WiFiUDP Udp;
unsigned int localPort = 9876;
time_t getNtpTime();
void sendNTPpacket(IPAddress &address);

HTTPClient http;

void setup(){  
  Serial.begin(115200);
  Udp.begin(localPort);
  Serial.print("Local port: ");
  Serial.println(Udp.localPort());
  Serial.println("waiting for sync");
  setSyncProvider(getNtpTime);
  setSyncInterval(300);

  if(WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
    WiFi.begin(ssid, pass);
  }

  if(WiFi.status() == WL_CONNECTED) {
    Serial.println('WiFi connected');
    delay(1000);
  }
}

int timeBetweenPOST = 60*60*1000;
time_t prevDisplay = 0;

void loop() {
  for(int cnt = 0; cnt <= 23; cnt++){
    Serial.println(cnt);

    readSensor = analogRead(AnalogIn);
    Serial.println(readSensor);

    prevDisplay = now();
    int hours = hour();
    Serial.println("hour");
    Serial.println(hours);
    Serial.println("");
    
    http.begin("http://mintsensor.herokuapp.com/value/");
    http.addHeader("content-type", "application/json");
    char buffer[32];
    char bufID[sizeof(hours)+1];
    char bufVal[sizeof(readSensor)+1];
    sprintf(bufID, "%d", hours);
    sprintf(bufVal, "%d", readSensor);
    strcat(buffer, "{\"value\": \"");
    strcat(buffer, bufVal);
    strcat(buffer, "\",\"id\":\"");
    strcat(buffer, bufID);
    strcat(buffer, "\"}");
    Serial.println(buffer);

    String postMsg = buffer;
    int httpCode = http.POST(postMsg);
    Serial.println(httpCode);
    http.writeToStream(&Serial);
    http.end();
    delay(timeBetweenPOST);
  }
}

/*-------- NTP code ----------*/

const int NTP_PACKET_SIZE = 48; // NTP time is in the first 48 bytes of message
byte packetBuffer[NTP_PACKET_SIZE]; //buffer to hold incoming & outgoing packets

time_t getNtpTime()
{
  IPAddress ntpServerIP; // NTP server's ip address

  while (Udp.parsePacket() > 0) ; // discard any previously received packets
  Serial.println("Transmit NTP Request");
  // get a random server from the pool
  WiFi.hostByName(ntpServerName, ntpServerIP);
  Serial.print(ntpServerName);
  Serial.print(": ");
  Serial.println(ntpServerIP);
  sendNTPpacket(ntpServerIP);
  uint32_t beginWait = millis();
  while (millis() - beginWait < 1500) {
    int size = Udp.parsePacket();
    if (size >= NTP_PACKET_SIZE) {
      Serial.println("Receive NTP Response");
      Udp.read(packetBuffer, NTP_PACKET_SIZE);  // read packet into the buffer
      unsigned long secsSince1900;
      // convert four bytes starting at location 40 to a long integer
      secsSince1900 =  (unsigned long)packetBuffer[40] << 24;
      secsSince1900 |= (unsigned long)packetBuffer[41] << 16;
      secsSince1900 |= (unsigned long)packetBuffer[42] << 8;
      secsSince1900 |= (unsigned long)packetBuffer[43];
      return secsSince1900 - 2208988800UL + timeZone * SECS_PER_HOUR;
    }
  }
  Serial.println("No NTP Response :-(");
  return 0; // return 0 if unable to get the time
}

// send an NTP request to the time server at the given address
void sendNTPpacket(IPAddress &address)
{
  // set all bytes in the buffer to 0
  memset(packetBuffer, 0, NTP_PACKET_SIZE);
  // Initialize values needed to form NTP request
  // (see URL above for details on the packets)
  packetBuffer[0] = 0b11100011;   // LI, Version, Mode
  packetBuffer[1] = 0;     // Stratum, or type of clock
  packetBuffer[2] = 6;     // Polling Interval
  packetBuffer[3] = 0xEC;  // Peer Clock Precision
  // 8 bytes of zero for Root Delay & Root Dispersion
  packetBuffer[12] = 49;
  packetBuffer[13] = 0x4E;
  packetBuffer[14] = 49;
  packetBuffer[15] = 52;
  // all NTP fields have been given values, now
  // you can send a packet requesting a timestamp:
  Udp.beginPacket(address, 123); //NTP requests are to port 123
  Udp.write(packetBuffer, NTP_PACKET_SIZE);
  Udp.endPacket();
}