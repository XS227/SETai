import bpy,math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene
s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=60
s.render.fps=24;s.frame_start=1;s.frame_end=145
s.world=bpy.data.worlds.new('Soft neutral world');s.world.color=(.22,.22,.22)
def material(name,color,rough=.4,noise=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=155;tex.inputs['Detail'].default_value=3
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.003
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 return m
olive=material('Tåkegrønn · photo matched study',(.23,.255,.205),.32)
stone=material('Turbine Grey · procedural approximation',(.14,.145,.13),.38,True)
white=material('Glazed white ceramic',(.93,.93,.90),.17)
wall=material('Warm limestone study',(.51,.47,.39),.82,True)
floor=material('Sand tile',(.38,.35,.30),.65,True)
black=material('Brushed black fittings',(.018,.02,.017),.26)
chrome=material('Mirror silver',(.8,.85,.85),.025);chrome.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=1
wood=material('Oak detail',(.23,.12,.055),.5,True)
def cube(name,loc,dim,mat,bevel=.006):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cylinder(name,loc,radius,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
# Product faces toward negative Y, Z is upright in Blender. Width exactly 1.205m.
cube('Vedum carcass',(0,.285,.691),(1.205,.54,.422),olive)
for x in [-.302,.302]:cube('Flow drawer front',(x,.004,.683),(.598,.025,.396),olive,.003)
cube('Shadow pull recess',(0,-.003,.888),(1.185,.012,.014),black,.002)
cube('Turbine Grey countertop',(0,.277,.914),(1.225,.565,.024),stone,.004)
# Hollow oval counter-top washbasin, outer surface -> thin lip -> inner bowl -> drain.
profiles=[(.075,.005),(.19,.025),(.225,.09),(.224,.135),(.216,.142),(.205,.136),(.198,.095),(.17,.045),(.06,.025),(.022,.025)]
verts=[];faces=[];N=96
for r,z in profiles:
 for i in range(N):
  a=2*math.pi*i/N;verts.append((r*math.cos(a)*1.23,.255+r*math.sin(a)*.86,.927+z))
for j in range(len(profiles)-1):
 for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
mesh=bpy.data.meshes.new('Bowl hollow profile');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('White oval basin · opening faces UP',mesh);s.collection.objects.link(o);o.data.materials.append(white)
for p in mesh.polygons:p.use_smooth=True
cylinder('Basin drain',(0,.255,.954),.022,.004,chrome)
cylinder('Black tap upright',(.21,.47,1.055),.017,.26,black)
o=cylinder('Black tap spout',(.21,.398,1.177),.018,.15,black);o.rotation_euler[0]=math.pi/2
# Architectural room with real edge depth and subtle surface relief.
cube('Back wall',(0,.67,1.4),(4,.12,2.8),wall,.002)
cube('Side wall',(-1.6,-.8,1.4),(.12,3,2.8),wall,.002)
for x in range(-3,4):
 for y in range(-4,2):cube('600mm floor tile',(x*.603,y*.603,-.018),(.6,.6,.035),floor,.0015)
# Round mirror stands vertically on the back wall.
o=cylinder('Round mirror',(0,.588,1.73),.48,.012,chrome);o.rotation_euler[0]=math.pi/2
cube('Accessory shelf',(-.88,.48,1.35),(.4,.22,.018),stone)
for x in [-.99,-.86]:
 cylinder('Amber bottle',(x,.47,1.43),.035,.14,black);cylinder('Bottle cap',(x,.47,1.515),.022,.025,black)
# Oak battens appear in peripheral right edge, keeping product unobstructed.
for i in range(13):cube('Oak vertical batten',(.93+i*.033,.595,1.4),(.021,.025,2.8),wood,.002)
# Soft daylight motivated by a large opening outside the left edge.
def light(name,loc,power,size,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,.2,.9))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large window daylight',(-2,-2,3.2),550,3,(1,.93,.82));light('Soft ceiling bounce',(1,-1,3),160,2,(.85,.91,1));light('Countertop edge fill',(2,-2,1.5),75,2,(1,.9,.78))
bpy.ops.object.camera_add(location=(2,-2.8,1.55));cam=bpy.context.object;cam.name='Cinematic camera';s.camera=cam;cam.data.lens=48
for frame,loc,target in [(1,(1.7,-2.65,1.55),(0,.2,1.15)),(73,(1.25,-2.45,1.48),(0,.2,1.16)),(145,(.8,-2.25,1.44),(0,.2,1.17))]:
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
s.frame_set(73);s.view_settings.view_transform='AgX'
t=artifacts.file(name='vedum-bathroom-preview.png',media_type='image/png');s.render.image_settings.media_type='IMAGE';s.render.image_settings.file_format='PNG';s.render.filepath=str(t.path);bpy.ops.render.render(write_still=True);t.publish()
result={'size_m':[1.205,.54,.422],'bowl_axis':'Z-up opening','frames':145,'fps':24,'note':'Reconstructed Vedum concept; procedural material approximations, not supplier CAD/textures.'}
