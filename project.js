import {defs, tiny} from './common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}


export class Shape_From_File extends Shape {                                   // **Shape_From_File** is a versatile standalone Shape that imports
                                                                               // all its arrays' data from an .obj 3D model file.
    constructor(filename) {
        super("position", "normal", "texture_coord");
        // Begin downloading the mesh. Once that completes, return
        // control to our parse_into_mesh function.
        this.load_file(filename);
    }

    load_file(filename) {                             // Request the external file and wait for it to load.
        // Failure mode:  Loads an empty shape.
        return fetch(filename)
            .then(response => {
                if (response.ok) return Promise.resolve(response.text())
                else return Promise.reject(response.status)
            })
            .then(obj_file_contents => this.parse_into_mesh(obj_file_contents))
            .catch(error => {
                this.copy_onto_graphics_card(this.gl);
            })
    }

    parse_into_mesh(data) {                           // Adapted from the "webgl-obj-loader.js" library found online:
        var verts = [], vertNormals = [], textures = [], unpacked = {};

        unpacked.verts = [];
        unpacked.norms = [];
        unpacked.textures = [];
        unpacked.hashindices = {};
        unpacked.indices = [];
        unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;
        var NORMAL_RE = /^vn\s/;
        var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;
        var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var elements = line.split(WHITESPACE_RE);
            elements.shift();

            if (VERTEX_RE.test(line)) verts.push.apply(verts, elements);
            else if (NORMAL_RE.test(line)) vertNormals.push.apply(vertNormals, elements);
            else if (TEXTURE_RE.test(line)) textures.push.apply(textures, elements);
            else if (FACE_RE.test(line)) {
                var quad = false;
                for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
                    if (j === 3 && !quad) {
                        j = 2;
                        quad = true;
                    }
                    if (elements[j] in unpacked.hashindices)
                        unpacked.indices.push(unpacked.hashindices[elements[j]]);
                    else {
                        var vertex = elements[j].split('/');

                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

                        if (textures.length) {
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 0]);
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 1]);
                        }

                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 0]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 1]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 2]);

                        unpacked.hashindices[elements[j]] = unpacked.index;
                        unpacked.indices.push(unpacked.index);
                        unpacked.index += 1;
                    }
                    if (j === 3 && quad) unpacked.indices.push(unpacked.hashindices[elements[0]]);
                }
            }
        }
        {
            const {verts, norms, textures} = unpacked;
            for (var j = 0; j < verts.length / 3; j++) {
                this.arrays.position.push(vec3(verts[3 * j], verts[3 * j + 1], verts[3 * j + 2]));
                this.arrays.normal.push(vec3(norms[3 * j], norms[3 * j + 1], norms[3 * j + 2]));
                this.arrays.texture_coord.push(vec(textures[2 * j], textures[2 * j + 1]));
            }
            this.indices = unpacked.indices;
        }
        this.normalize_positions(false);
        this.ready = true;
    }

    draw(context, program_state, model_transform, material) {               // draw(): Same as always for shapes, but cancel all
        // attempts to draw the shape before it loads:
        if (this.ready)
            super.draw(context, program_state, model_transform, material);
    }
}











class Base_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.isJumping = false;

        this.jumpStartTime = 0;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
            
            sphere: new defs.Subdivision_Sphere(3), //using 3 subdivisions so that you can see the rotation of the sphere

            'dino': new Shape_From_File("assets/dino.obj"),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            dino: new Material(new defs.Phong_Shader(),
                {ambient: 0.3, color: hex_color("#964B00")}),
        };


        this.initial_camera_location = Mat4.translation(-10, 0, 0).times(Mat4.look_at(vec3(0, 5, 20), vec3(0, 5, 0), vec3(0, 1, 0)));

    }

    display(context, program_state) {
        

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0);

            program_state.set_camera(Mat4.translation(5, -10, -30));
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            //program_state.set_camera(Mat4.translation(5, -10, -30));
       }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(-3, 10, -5, .9);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
}

export class project extends Base_Scene {


    make_control_panel() {
        this.key_triggered_button("jump", [" "], () => {
            if(!this.isJumping) //don't want to do a second jump if we are already jumping
                this.jumpStartTime = this.time;
            this.isJumping = true; 
        });
    }

    jump(program_state, model_transform, time){

        var x = 7 * (Math.sin(Math.PI*(time-this.jumpStartTime)));
        //model_transform  = model_transform.times( Mat4.rotation(x, 0, 0, -1 ) );
        model_transform  = model_transform.times( Mat4.translation(0, x, 0));
        
        if(model_transform[1][3] <= 0.01)
        	this.isJumping = false; 
        
        return model_transform;
    }

    drawDino(context, program_state, time)
    {
        let model_transform = Mat4.identity();

        if (this.isJumping)
            model_transform = this.jump(program_state, model_transform, time);
        
        const dinoRotation = Mat4.rotation(Math.PI/2, 0, 1, 0);
        const dinoTranslation = Mat4.translation(0, 0.6, 0);
            
        model_transform = model_transform.times(dinoTranslation).times(dinoRotation); //give the ball an appearance as if it is moving

        
        this.shapes.dino.draw(context, program_state, model_transform, this.materials.dino);
    }

    drawGrass(context, program_state)
    {
      
        let model_transform = Mat4.identity();
        const grass = hex_color("#47F33B");
        
        const grassScale = Mat4.scale(20, 0.1, 6);
        const grassTranslation = Mat4.translation(10, -1, 0);

        model_transform = model_transform.times(grassTranslation).times(grassScale);

        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: grass}));
    }

    drawbackground(context, program_state, time)
    {
        let t = this.time; 
        let model_transform = Mat4.identity();
        var sun_scale = 4 + Math.sin(t/3 - (Math.PI));
        
        const sky_scale = Mat4.scale(21, 9, 0.1);
        const sky_translation = Mat4.translation(10, 7.5, -7);

        model_transform = model_transform.times(sky_translation).times(sky_scale);
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: color(1, -0.5 + 0.5 * sun_scale, -0.5 + 0.5 * sun_scale, 1)}));
    }

    drawObstacles(context, program_state, time)
    {
        let model_transform2 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform3 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform4 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));
        let model_transform5 = Mat4.identity().times(Mat4.translation(28,0,0)).times(Mat4.scale(0.8,1,6 ));

        
        let h = 2.5; //can change speed with score using h

        let t = -24+24*Math.cos(time/h);
        let t2 =-24-24*Math.cos(time/h);
        let t3 =-24+24*Math.cos(time/h + 1.5);
        let t4 =-24-24*Math.cos(time/h +1.5);
                

        model_transform2 = model_transform2.times(Mat4.translation(t,0,0)); 
        model_transform3 = model_transform3.times(Mat4.translation(t2,0,0)); 
        model_transform4 = model_transform4.times(Mat4.translation(t3,0,0));
        model_transform5 = model_transform5.times(Mat4.translation(t4,0,0));
               

        if (-(24/2.5)*Math.sin(time/h) <= 0 )
        {
            this.shapes.cube.draw(context,program_state,model_transform2,this.materials.test);
        }
        if ((24/2.5)*Math.sin(time/h) <= 0 )
        {
             this.shapes.cube.draw(context,program_state,model_transform3,this.materials.test);
        }
        if (-(24/2.5)*Math.sin(time/h+1.5) <= 0 )
        {
             this.shapes.cube.draw(context,program_state,model_transform4,this.materials.test);
        }
        if ((24/2.5)*Math.sin(time/h+1.5) <= 0 )
        {
             this.shapes.cube.draw(context,program_state,model_transform5,this.materials.test);
        }
    }

    

    display(context, program_state) {
        super.display(context, program_state); // <- commenting out this line of code will result in program crashing

        program_state.set_camera(this.initial_camera_location);
        
 
        const time = this.time = program_state.animation_time / 1000;
        
        
        this.drawObstacles(context, program_state, time);
        this.drawGrass(context, program_state); 
        this.drawbackground(context, program_state, time); 
        this.drawDino(context, program_state, time);



    }
} 