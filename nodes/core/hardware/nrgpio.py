#
# Copyright 2014 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Import library functions we need
import RPi.GPIO as GPIO
import sys

bounce = 20     # bounce time in mS to apply

if len(sys.argv) > 1:
    cmd = sys.argv[1].lower()
    pin = int(sys.argv[2])
    GPIO.setmode(GPIO.BOARD)
    GPIO.setwarnings(False)

    if cmd == "pwm":
        #print "Initialised pin "+str(pin)+" to PWM"
        GPIO.setup(pin,GPIO.OUT)
        p = GPIO.PWM(pin, 100)
        p.start(0)

        while True:
            try:
                data = raw_input()
                if data == "close":
                    GPIO.cleanup(pin)
                    sys.exit(0)
                p.ChangeDutyCycle(float(data))
            except EOFError:        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)
            except Exception as ex:
                print "bad data: "+data

    if cmd == "buzz":
        #print "Initialised pin "+str(pin)+" to Buzz"
        GPIO.setup(pin,GPIO.OUT)
        p = GPIO.PWM(pin, 100)
        p.stop()

        while True:
            try:
                data = raw_input()
                if data == "close":
                    GPIO.cleanup(pin)
                    sys.exit(0)
                elif float(data) == 0:
                    p.stop()
                else:
                    p.start(50)
                    p.ChangeFrequency(float(data))
            except EOFError:        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)
            except Exception as ex:
                print "bad data: "+data

    elif cmd == "out":
        #print "Initialised pin "+str(pin)+" to OUT"
        GPIO.setup(pin,GPIO.OUT)
        if len(sys.argv) == 4:
            GPIO.output(pin,int(sys.argv[3]))

        while True:
            try:
                data = raw_input()
                if data == "close":
                    GPIO.cleanup(pin)
                    sys.exit(0)
                data = int(data)
            except EOFError:        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)
            except:
                data = 0
            if data != 0:
                data = 1
            GPIO.output(pin,data)

    elif cmd == "in":
        #print "Initialised pin "+str(pin)+" to IN"
        def handle_callback(chan):
            print GPIO.input(chan)

        if len(sys.argv) == 4:
            if sys.argv[3].lower() == "up":
                GPIO.setup(pin,GPIO.IN,GPIO.PUD_UP)
            elif sys.argv[3].lower() == "down":
                GPIO.setup(pin,GPIO.IN,GPIO.PUD_DOWN)
            else:
                GPIO.setup(pin,GPIO.IN)
        else:
            GPIO.setup(pin,GPIO.IN)
        print GPIO.input(pin)
        GPIO.add_event_detect(pin, GPIO.BOTH, callback=handle_callback, bouncetime=bounce)

        while True:
            try:
                data = raw_input()
                if data == "close":
                    GPIO.cleanup(pin)
                    sys.exit(0)
            except EOFError:        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)

    elif cmd == "rev":
        print GPIO.RPI_REVISION

    elif cmd == "ver":
        print GPIO.VERSION

else:
    print "Bad parameters - {in|out|pwm} {pin} {value|up|down}"
