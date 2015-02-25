#!/usr/bin/python
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

if sys.version_info >= (3,0):
    print("Sorry - currently only configured to work with python 2.x")
    sys.exit(1)

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
                if 'close' in data:
                    sys.exit(0)
                p.ChangeDutyCycle(float(data))
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)
            except Exception as ex:
                print "bad data: "+data

    elif cmd == "buzz":
        #print "Initialised pin "+str(pin)+" to Buzz"
        GPIO.setup(pin,GPIO.OUT)
        p = GPIO.PWM(pin, 100)
        p.stop()

        while True:
            try:
                data = raw_input()
                if 'close' in data:
                    sys.exit(0)
                elif float(data) == 0:
                    p.stop()
                else:
                    p.start(50)
                    p.ChangeFrequency(float(data))
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
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
                if 'close' in data:
                    sys.exit(0)
                data = int(data)
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
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
                if 'close' in data:
                    sys.exit(0)
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup(pin)
                sys.exit(0)

    elif cmd == "byte":
        #print "Initialised BYTE mode - "+str(pin)+
        list = [7,11,13,12,15,16,18,22]
        GPIO.setup(list,GPIO.OUT)

        while True:
            try:
                data = raw_input()
                if 'close' in data:
                    sys.exit(0)
                data = int(data)
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup()
                sys.exit(0)
            except:
                data = 0
            for bit in range(8):
                if pin == 1:
                    mask = 1 << (7 - bit)
                else:
                    mask = 1 << bit
                GPIO.output(list[bit], data & mask)

    elif cmd == "borg":
        #print "Initialised BORG mode - "+str(pin)+
        GPIO.setup(11,GPIO.OUT)
        GPIO.setup(13,GPIO.OUT)
        GPIO.setup(15,GPIO.OUT)
        r = GPIO.PWM(11, 100)
        g = GPIO.PWM(13, 100)
        b = GPIO.PWM(15, 100)
        r.start(0)
        g.start(0)
        b.start(0)

        while True:
            try:
                data = raw_input()
                if 'close' in data:
                    sys.exit(0)
                c = data.split(",")
                r.ChangeDutyCycle(float(c[0]))
                g.ChangeDutyCycle(float(c[1]))
                b.ChangeDutyCycle(float(c[2]))
            except (EOFError, SystemExit):        # hopefully always caused by us sigint'ing the program
                GPIO.cleanup()
                sys.exit(0)
            except:
                data = 0

    elif cmd == "rev":
        print GPIO.RPI_REVISION

    elif cmd == "ver":
        print GPIO.VERSION

    elif cmd == "mouse":  # catch mice button events
        file = open( "/dev/input/mice", "rb" )
        oldbutt = 0

        def getMouseEvent():
          global oldbutt
          global pin
          buf = file.read(3)
          pin = pin & 0x07
          button = ord( buf[0] ) & pin # mask out just the required button(s)
          if button != oldbutt:  # only send if changed
              oldbutt = button
              print button

        while True:
            try:
                getMouseEvent()
            except:
                file.close()
                sys.exit(0)

else:
    print "Bad parameters - {in|out|pwm} {pin} {value|up|down}"
